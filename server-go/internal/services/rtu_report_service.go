package services

import (
	"context"
	"math"
	"time"

	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUReportService interface {
	GetDashboardSummary(ctx context.Context, outletID, month string) (map[string]interface{}, error)
}

type rtuReportService struct {
	db *gorm.DB
}

func NewRTUReportService(db *gorm.DB) RTUReportService {
	return &rtuReportService{db: db}
}

func (s *rtuReportService) GetDashboardSummary(ctx context.Context, outletID, month string) (map[string]interface{}, error) {
	var totalProductionCost float64
	var totalBatches int64
	var activeMaterials int64
	var totalDistribution int64
	var estimatedInventoryValue float64

	// Date parsing (Month: YYYY-MM)
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	startDate, err := time.Parse("2006-01-02", month+"-01")
	if err != nil {
		startDate, _ = time.Parse("2006-01-02", time.Now().Format("2006-01")+"-01")
	}
	endDate := startDate.AddDate(0, 1, 0)

	hasOutlet := outletID != "" && outletID != "all"

	// 1. Total Production Cost (in selected month & outlet)
	queryCost := s.db.WithContext(ctx).Model(&models.RTUProductionBatch{}).
		Where("status = ? AND is_deleted = false AND created_at >= ? AND created_at < ?", models.BatchStatusCompleted, startDate, endDate)
	if hasOutlet {
		queryCost = queryCost.Where("outlet_id = ?", outletID)
	}
	queryCost.Select("COALESCE(SUM(total_cost), 0)").Row().Scan(&totalProductionCost)

	// 2. Count Active / Total Batches in selected month & outlet
	queryBatches := s.db.WithContext(ctx).Model(&models.RTUProductionBatch{}).
		Where("is_deleted = false AND created_at >= ? AND created_at < ?", startDate, endDate)
	if hasOutlet {
		queryBatches = queryBatches.Where("outlet_id = ?", outletID)
	}
	queryBatches.Count(&totalBatches)

	// 3. Active Materials
	queryMaterials := s.db.WithContext(ctx).Model(&models.RTUMaterial{}).
		Where("is_deleted = false")
	queryMaterials.Count(&activeMaterials)

	// 4. Distribution Count in selected month & outlet
	queryDist := s.db.WithContext(ctx).Model(&models.RTUDistribution{}).
		Where("is_deleted = false AND created_at >= ? AND created_at < ?", startDate, endDate)
	if hasOutlet {
		queryDist = queryDist.Where("outlet_id = ? OR source_outlet_id = ?", outletID, outletID)
	}
	queryDist.Count(&totalDistribution)

	// 5. Estimasi Nilai Inventori (Berdasarkan snapshot akhir bulan terpilih atau live stock)
	isPastMonth := endDate.Before(time.Now())

	if isPastMonth {
		if hasOutlet {
			s.db.WithContext(ctx).Raw(`
				SELECT COALESCE(SUM(sub.balance_after * CASE WHEN sub.price_at_time > 0 THEN sub.price_at_time ELSE m.current_price END), 0)
				FROM (
					SELECT DISTINCT ON (material_id) material_id, balance_after, price_at_time
					FROM rtu_stock_ledgers
					WHERE outlet_id = ? AND created_at < ? AND material_id IS NOT NULL
					ORDER BY material_id, created_at DESC, id DESC
				) sub
				JOIN rtu_materials m ON sub.material_id = m.id
				WHERE m.is_deleted = false
			`, outletID, endDate).Scan(&estimatedInventoryValue)
		} else {
			s.db.WithContext(ctx).Raw(`
				SELECT COALESCE(SUM(sub.balance_after * CASE WHEN sub.price_at_time > 0 THEN sub.price_at_time ELSE m.current_price END), 0)
				FROM (
					SELECT DISTINCT ON (material_id, outlet_id) material_id, outlet_id, balance_after, price_at_time
					FROM rtu_stock_ledgers
					WHERE created_at < ? AND material_id IS NOT NULL
					ORDER BY material_id, outlet_id, created_at DESC, id DESC
				) sub
				JOIN rtu_materials m ON sub.material_id = m.id
				WHERE m.is_deleted = false
			`, endDate).Scan(&estimatedInventoryValue)
		}
	} else {
		if hasOutlet {
			var outletVal float64
			s.db.WithContext(ctx).Raw(`
				SELECT COALESCE(SUM(s.current_stock * CASE WHEN s.current_price > 0 THEN s.current_price ELSE m.current_price END), 0)
				FROM rtu_outlet_material_stocks s
				JOIN rtu_materials m ON s.material_id = m.id
				WHERE s.outlet_id = ? AND m.is_deleted = false
			`, outletID).Scan(&outletVal)

			if outletVal > 0 {
				estimatedInventoryValue = outletVal
			} else {
				s.db.WithContext(ctx).Raw(`
					SELECT COALESCE(SUM(current_stock * current_price), 0)
					FROM rtu_materials
					WHERE is_deleted = false
				`).Scan(&estimatedInventoryValue)
			}
		} else {
			var outletSum float64
			s.db.WithContext(ctx).Raw(`
				SELECT COALESCE(SUM(s.current_stock * CASE WHEN s.current_price > 0 THEN s.current_price ELSE m.current_price END), 0)
				FROM rtu_outlet_material_stocks s
				JOIN rtu_materials m ON s.material_id = m.id
				WHERE m.is_deleted = false
			`).Scan(&outletSum)

			var globalSum float64
			s.db.WithContext(ctx).Raw(`
				SELECT COALESCE(SUM(current_stock * current_price), 0)
				FROM rtu_materials
				WHERE is_deleted = false
			`).Scan(&globalSum)

			if outletSum > globalSum {
				estimatedInventoryValue = outletSum
			} else {
				estimatedInventoryValue = globalSum
			}
		}
	}
	estimatedInventoryValue = math.Round(estimatedInventoryValue)

	// 6. Production Trend for the selected month
	type Trend struct {
		Date  string  `json:"date"`
		Total float64 `json:"total"`
	}
	var trends []Trend

	trendQuery := `
		SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(total_cost), 0) as total
		FROM rtu_production_batches
		WHERE created_at >= ? AND created_at < ? AND status = 'completed' AND is_deleted = false
	`
	var trendArgs []interface{}
	trendArgs = append(trendArgs, startDate, endDate)

	if hasOutlet {
		trendQuery += " AND outlet_id = ?"
		trendArgs = append(trendArgs, outletID)
	}
	trendQuery += `
		GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
		ORDER BY date ASC
	`
	s.db.WithContext(ctx).Raw(trendQuery, trendArgs...).Scan(&trends)

	// 7. Top 5 Products by Volume (Completed)
	type TopProduct struct {
		Name  string  `json:"name"`
		Total float64 `json:"total"`
	}
	var topProducts []TopProduct
	topQuery := `
		SELECT p.name, COALESCE(SUM(b.actual_qty), 0) as total
		FROM rtu_production_batches b
		JOIN rtu_products p ON b.product_id = p.id
		WHERE b.created_at >= ? AND b.created_at < ? AND b.status = 'completed' AND b.is_deleted = false
	`
	var topArgs []interface{}
	topArgs = append(topArgs, startDate, endDate)

	if hasOutlet {
		topQuery += " AND b.outlet_id = ?"
		topArgs = append(topArgs, outletID)
	}
	topQuery += `
		GROUP BY p.name
		ORDER BY total DESC
		LIMIT 5
	`
	s.db.WithContext(ctx).Raw(topQuery, topArgs...).Scan(&topProducts)

	// 8. Production Loss/Gain Trend (Yield Efficiency)
	type LossTrend struct {
		Date      string  `json:"date"`
		YieldRate float64 `json:"yieldRate"`
	}
	var losses []LossTrend
	lossQuery := `
		SELECT TO_CHAR(b.created_at, 'YYYY-MM-DD') as date, 
		       AVG(CASE WHEN u.actual_qty > 0 THEN (u.planned_qty / u.actual_qty) * 100 ELSE 100 END) as yield_rate
		FROM rtu_production_batches b
		JOIN rtu_material_usages u ON b.id = u.batch_id
		WHERE b.created_at >= ? AND b.created_at < ? AND b.status = 'completed' AND b.is_deleted = false
	`
	var lossArgs []interface{}
	lossArgs = append(lossArgs, startDate, endDate)

	if hasOutlet {
		lossQuery += " AND b.outlet_id = ?"
		lossArgs = append(lossArgs, outletID)
	}
	lossQuery += `
		GROUP BY TO_CHAR(b.created_at, 'YYYY-MM-DD')
		ORDER BY date ASC
	`
	s.db.WithContext(ctx).Raw(lossQuery, lossArgs...).Scan(&losses)

	return map[string]interface{}{
		"stats": map[string]interface{}{
			"totalProductionCost":     totalProductionCost,
			"totalBatches":            totalBatches,
			"activeMaterials":         activeMaterials,
			"totalDistribution":        totalDistribution,
			"estimatedInventoryValue": estimatedInventoryValue,
		},
		"productionTrend": trends,
		"topProducts":     topProducts,
		"losses":          losses,
	}, nil
}
