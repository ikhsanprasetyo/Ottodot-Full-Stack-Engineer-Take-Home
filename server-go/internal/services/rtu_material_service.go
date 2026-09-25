package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/websocket"
	"gorm.io/gorm"
)

type RTUMaterialService interface {
	AdjustStock(ctx context.Context, materialID uuid.UUID, outletID uuid.UUID, qty float64, movementType string, refType string, refID *uuid.UUID, notes *string, updatedBy uuid.UUID) error
	UpdatePrice(ctx context.Context, materialID uuid.UUID, outletID *uuid.UUID, newPrice float64, vendorID *uuid.UUID, source string, notes *string, updatedBy uuid.UUID) error
}

type rtuMaterialService struct {
	db           *gorm.DB
	materialRepo repositories.RTUMaterialRepository
	hub          *websocket.Hub
}

func NewRTUMaterialService(db *gorm.DB, materialRepo repositories.RTUMaterialRepository, hub *websocket.Hub) RTUMaterialService {
	return &rtuMaterialService{
		db:           db,
		materialRepo: materialRepo,
		hub:          hub,
	}
}

func (s *rtuMaterialService) AdjustStock(ctx context.Context, materialID uuid.UUID, outletID uuid.UUID, qty float64, movementType string, refType string, refID *uuid.UUID, notes *string, updatedBy uuid.UUID) error {
	material, err := s.materialRepo.FindByID(ctx, materialID)
	if err != nil {
		return err
	}
	if material == nil {
		return errors.New("material not found")
	}

	// 1. Get or Create Outlet Stock
	// Using the DB directly or adding method to repo? Let's use repo if possible, but I'll use DB for now as a quick fix or update repo later.
	// Actually, let's update repository to handle this.
	
	// For now, let's assume we use a transaction-less update or I'll implement it in service with DB
	// But best practice is in repository.
	// I'll update the logic here to use the new multi-outlet stock table.
	return s.db.Transaction(func(tx *gorm.DB) error {
		var outletStock models.RTUOutletMaterialStock
		if err := tx.Where("material_id = ? AND outlet_id = ?", materialID, outletID).First(&outletStock).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				outletStock = models.RTUOutletMaterialStock{
					MaterialID:   materialID,
					OutletID:     outletID,
					CurrentStock: 0,
					MinStock:     0,
				}
				if err := tx.Create(&outletStock).Error; err != nil {
					return err
				}
			} else {
				return err
			}
		}

		newStock := outletStock.CurrentStock + qty

		var createdByPtr *uuid.UUID
		if updatedBy != uuid.Nil {
			createdByPtr = &updatedBy
		}

		// a. Create Ledger Entry
		ledgerEntry := &models.RTUStockLedger{
			MaterialID:   &materialID,
			OutletID:     outletID,
			MovementType: movementType,
			Qty:          qty,
			Unit:         material.Unit,
			RefType:      refType,
			RefID:        refID,
			BalanceAfter: newStock,
			PriceAtTime:  material.CurrentPrice,
			Notes:        notes,
			CreatedBy:    createdByPtr,
			CreatedAt:    time.Now(),
		}

		if err := tx.Create(ledgerEntry).Error; err != nil {
			return err
		}

		// b. Update Outlet Stock
		outletStock.CurrentStock = newStock
		if err := tx.Save(&outletStock).Error; err != nil {
			return err
		}

		// c. Realtime Stock Alert if stock < minStock (using outlet minStock if available, otherwise global)
		threshold := material.MinStock
		if outletStock.MinStock > 0 {
			threshold = outletStock.MinStock
		}

		if outletStock.CurrentStock < threshold {
			alertMessage := map[string]interface{}{
				"type":      "rtu_stock_alert",
				"material":  material.Name,
				"code":      material.Code,
				"current":   outletStock.CurrentStock,
				"minimum":   threshold,
				"unit":      material.Unit,
				"outlet_id": outletID,
				"timestamp": time.Now(),
			}
			s.hub.Broadcast("rtu_stock_alert", alertMessage)
		}

		return nil
	})
}

func (s *rtuMaterialService) UpdatePrice(ctx context.Context, materialID uuid.UUID, outletID *uuid.UUID, newPrice float64, vendorID *uuid.UUID, source string, notes *string, updatedBy uuid.UUID) error {
	material, err := s.materialRepo.FindByID(ctx, materialID)
	if err != nil {
		return err
	}
	if material == nil {
		return errors.New("material not found")
	}

	// 1. Create Price History Entry
	history := &models.RTUMaterialPriceHistory{
		MaterialID:    materialID,
		OutletID:      outletID,
		VendorID:      vendorID,
		Price:         newPrice,
		EffectiveDate: time.Now(),
		Source:        source,
		Notes:         notes,
		CreatedBy:     &updatedBy,
		CreatedAt:     time.Now(),
	}

	if err := s.materialRepo.AddPriceHistory(ctx, history); err != nil {
		return err
	}

	// 2. Update Price
	now := time.Now()
	
	if outletID != nil {
		// Update Outlet Stock Price
		var outletStock models.RTUOutletMaterialStock
		if err := s.db.WithContext(ctx).Where("material_id = ? AND outlet_id = ?", materialID, *outletID).First(&outletStock).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				outletStock = models.RTUOutletMaterialStock{
					MaterialID:   materialID,
					OutletID:     *outletID,
					CurrentStock: 0,
					MinStock:     0,
					CurrentPrice: newPrice,
					LastPriceDate: &now,
				}
				if err := s.db.WithContext(ctx).Create(&outletStock).Error; err != nil {
					return err
				}
			} else {
				return err
			}
		} else {
			outletStock.CurrentPrice = newPrice
			outletStock.LastPriceDate = &now
			if err := s.db.WithContext(ctx).Save(&outletStock).Error; err != nil {
				return err
			}
		}
	} else {
		// Update Global Price
		material.CurrentPrice = newPrice
		material.LastPriceDate = &now
		material.UpdatedBy = &updatedBy
		if vendorID != nil {
			material.VendorID = vendorID
		}
		
		if err := s.materialRepo.Update(ctx, material); err != nil {
			return err
		}
	}

	return nil
}
