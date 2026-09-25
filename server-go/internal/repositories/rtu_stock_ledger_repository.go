package repositories

import (
	"context"
	"time"

	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUStockLedgerRepository interface {
	GetAll(ctx context.Context, filter map[string]interface{}) ([]models.RTUStockLedger, error)
	Create(ctx context.Context, ledger *models.RTUStockLedger) error
}

type rtuStockLedgerRepository struct {
	db *gorm.DB
}

func NewRTUStockLedgerRepository(db *gorm.DB) RTUStockLedgerRepository {
	return &rtuStockLedgerRepository{db: db}
}

func (r *rtuStockLedgerRepository) GetAll(ctx context.Context, filter map[string]interface{}) ([]models.RTUStockLedger, error) {
	var ledgers []models.RTUStockLedger
	query := r.db.WithContext(ctx).
		Preload("Material").
		Preload("Outlet").
		Preload("Creator").
		Preload("Creator.Position")

	if materialID, ok := filter["materialId"].(string); ok && materialID != "" && materialID != "all" {
		query = query.Where("material_id = ?", materialID)
	}

	if movementType, ok := filter["movementType"].(string); ok && movementType != "" && movementType != "all" {
		query = query.Where("movement_type = ?", movementType)
	}

	if outletID, ok := filter["outletId"].(string); ok && outletID != "" && outletID != "all" {
		query = query.Where("outlet_id = ?", outletID)
	}

	if month, ok := filter["month"].(string); ok && month != "" {
		if startDate, err := time.Parse("2006-01-02", month+"-01"); err == nil {
			endDate := startDate.AddDate(0, 1, 0)
			query = query.Where("created_at >= ? AND created_at < ?", startDate, endDate)
		}
	}

	err := query.Order("created_at DESC").Find(&ledgers).Error
	return ledgers, err
}

func (r *rtuStockLedgerRepository) Create(ctx context.Context, ledger *models.RTUStockLedger) error {
	return r.db.WithContext(ctx).Create(ledger).Error
}
