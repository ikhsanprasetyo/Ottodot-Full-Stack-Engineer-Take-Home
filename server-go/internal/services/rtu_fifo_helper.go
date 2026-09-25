package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

// ConsumeFIFO consumes a specific quantity of material or product from stock lots in FIFO order.
// Returns the total cost of consumed items.
func ConsumeFIFO(tx *gorm.DB, outletID uuid.UUID, itemID uuid.UUID, isProduct bool, qtyNeeded float64, refType string, refID uuid.UUID, receivedDate time.Time) (float64, error) {
	if qtyNeeded <= 0 {
		return 0, nil
	}

	var lots []models.RTUStockLot
	query := tx.Where("outlet_id = ? AND qty_remaining > 0", outletID)
	if isProduct {
		query = query.Where("product_id = ?", itemID)
	} else {
		query = query.Where("material_id = ?", itemID)
	}

	// FIFO Order
	err := query.Order("received_date ASC, created_at ASC").Find(&lots).Error
	if err != nil {
		return 0, fmt.Errorf("failed to fetch stock lots for FIFO: %w", err)
	}

	var totalCost float64
	qtyRemainingNeeded := qtyNeeded

	// 1. Consume from positive lots
	for i := range lots {
		lot := &lots[i]
		if qtyRemainingNeeded <= 0 {
			break
		}

		deducted := 0.0
		if lot.QtyRemaining >= qtyRemainingNeeded {
			deducted = qtyRemainingNeeded
			lot.QtyRemaining -= qtyRemainingNeeded
			totalCost += qtyRemainingNeeded * lot.UnitPrice
			qtyRemainingNeeded = 0
		} else {
			deducted = lot.QtyRemaining
			totalCost += lot.QtyRemaining * lot.UnitPrice
			qtyRemainingNeeded -= lot.QtyRemaining
			lot.QtyRemaining = 0
		}

		if err := tx.Save(lot).Error; err != nil {
			return 0, fmt.Errorf("failed to update consumed stock lot: %w", err)
		}

		movement := models.RTUStockLotMovement{
			ID:          uuid.New(),
			LotID:       lot.ID,
			RefType:     refType,
			RefID:       refID,
			QtyDeducted: deducted,
		}
		if err := tx.Create(&movement).Error; err != nil {
			return 0, fmt.Errorf("failed to create lot movement: %w", err)
		}
	}

	// 2. Handle deficit (allow negative)
	if qtyRemainingNeeded > 0 {
		// Try to find the most recent lot (even if empty) to assign the negative balance
		var lastLot models.RTUStockLot
		lastQuery := tx.Where("outlet_id = ?", outletID)
		if isProduct {
			lastQuery = lastQuery.Where("product_id = ?", itemID)
		} else {
			lastQuery = lastQuery.Where("material_id = ?", itemID)
		}
		
		err := lastQuery.Order("received_date DESC, created_at DESC").First(&lastLot).Error
		if err == nil {
			// Subtract deficit from this lot
			lastLot.QtyRemaining -= qtyRemainingNeeded
			totalCost += qtyRemainingNeeded * lastLot.UnitPrice
			if err := tx.Save(&lastLot).Error; err != nil {
				return 0, fmt.Errorf("failed to update lot with negative balance: %w", err)
			}
			
			movement := models.RTUStockLotMovement{
				ID:          uuid.New(),
				LotID:       lastLot.ID,
				RefType:     refType,
				RefID:       refID,
				QtyDeducted: qtyRemainingNeeded,
			}
			if err := tx.Create(&movement).Error; err != nil {
				return 0, fmt.Errorf("failed to create deficit lot movement: %w", err)
			}
		} else {
			// No lots exist at all, create a new deficit lot
			unitPrice := 0.0
			var lotNumber string
			
			if isProduct {
				var prod models.RTUProduct
				if err := tx.Where("id = ?", itemID).First(&prod).Error; err == nil {
					lotNumber = "LOT-DEF-PRD-" + prod.Code + "-" + time.Now().Format("20060102150405")
				} else {
					lotNumber = "LOT-DEF-PRD-UNKNOWN-" + time.Now().Format("20060102150405")
				}
			} else {
				var mat models.RTUMaterial
				if err := tx.Where("id = ?", itemID).First(&mat).Error; err == nil {
					unitPrice = mat.CurrentPrice
					lotNumber = "LOT-DEF-MAT-" + mat.Code + "-" + time.Now().Format("20060102150405")
				} else {
					lotNumber = "LOT-DEF-MAT-UNKNOWN-" + time.Now().Format("20060102150405")
				}
			}

			newDeficitLot := models.RTUStockLot{
				ID:           uuid.New(),
				OutletID:     outletID,
				LotNumber:    lotNumber,
				QtyInitial:   0,
				QtyRemaining: -qtyRemainingNeeded,
				UnitPrice:    unitPrice,
				RefType:      refType,
				RefID:        refID,
				ReceivedDate: receivedDate,
			}

			if isProduct {
				newDeficitLot.ProductID = &itemID
			} else {
				newDeficitLot.MaterialID = &itemID
			}

			if err := tx.Create(&newDeficitLot).Error; err != nil {
				return 0, fmt.Errorf("failed to create deficit stock lot: %w", err)
			}

			movement := models.RTUStockLotMovement{
				ID:          uuid.New(),
				LotID:       newDeficitLot.ID,
				RefType:     refType,
				RefID:       refID,
				QtyDeducted: qtyRemainingNeeded,
			}
			if err := tx.Create(&movement).Error; err != nil {
				return 0, fmt.Errorf("failed to create new deficit lot movement: %w", err)
			}

			totalCost += qtyRemainingNeeded * unitPrice
		}
	}

	return totalCost, nil
}

// ReconcileNewLot resolves any existing negative stock lots using the newly received stock lot.
func ReconcileNewLot(tx *gorm.DB, newLot *models.RTUStockLot) error {
	var negativeLots []models.RTUStockLot
	query := tx.Where("outlet_id = ? AND qty_remaining < 0", newLot.OutletID)
	
	if newLot.ProductID != nil {
		query = query.Where("product_id = ?", *newLot.ProductID)
	} else if newLot.MaterialID != nil {
		query = query.Where("material_id = ?", *newLot.MaterialID)
	} else {
		return nil
	}

	// Oldest negative lots first
	err := query.Order("received_date ASC, created_at ASC").Find(&negativeLots).Error
	if err != nil {
		return fmt.Errorf("failed to fetch negative lots for reconciliation: %w", err)
	}

	for i := range negativeLots {
		negLot := &negativeLots[i]
		if newLot.QtyRemaining <= 0 {
			break
		}

		deficitVal := -negLot.QtyRemaining
		if newLot.QtyRemaining >= deficitVal {
			newLot.QtyRemaining -= deficitVal
			negLot.QtyRemaining = 0
		} else {
			negLot.QtyRemaining += newLot.QtyRemaining
			newLot.QtyRemaining = 0
		}

		if err := tx.Save(negLot).Error; err != nil {
			return fmt.Errorf("failed to update reconciled negative lot: %w", err)
		}
	}

	return nil
}
