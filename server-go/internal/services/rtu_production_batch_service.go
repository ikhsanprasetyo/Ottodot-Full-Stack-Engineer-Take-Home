package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"gorm.io/gorm"
)

type RTUProductionBatchService interface {
	CreateBatch(ctx context.Context, batch *models.RTUProductionBatch, createdBy uuid.UUID) error
	UpdateBatch(ctx context.Context, batchID uuid.UUID, input *models.RTUProductionBatch, updatedBy uuid.UUID) error
	StartBatch(ctx context.Context, batchID uuid.UUID, updatedBy uuid.UUID) error
	CompleteBatch(ctx context.Context, batch *models.RTUProductionBatch, completedBy uuid.UUID) error
	CancelBatch(ctx context.Context, batchID uuid.UUID, cancelledBy uuid.UUID, reason string) error
	DeleteBatch(ctx context.Context, batchID uuid.UUID, deletedBy uuid.UUID) error
	RecalculateHPPForMonth(ctx context.Context, outletID uuid.UUID, monthYear string, hpp models.RTUMonthlyHPP) error
}

type rtuProductionBatchService struct {
	db        *gorm.DB
	batchRepo repositories.RTUProductionBatchRepository
}

func NewRTUProductionBatchService(db *gorm.DB, batchRepo repositories.RTUProductionBatchRepository) RTUProductionBatchService {
	return &rtuProductionBatchService{
		db:        db,
		batchRepo: batchRepo,
	}
}

func (s *rtuProductionBatchService) CreateBatch(ctx context.Context, batch *models.RTUProductionBatch, createdBy uuid.UUID) error {
	batch.Status = models.BatchStatusCompleted
	batch.CreatedBy = &createdBy
	batch.UpdatedBy = &createdBy
	
	now := time.Now()
	if !batch.PlannedDate.IsZero() {
		now = batch.PlannedDate
	} else {
		batch.PlannedDate = now
	}
	batch.CompletedDate = &now

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Log Creation History
		history := models.RTUProductionBatchHistory{
			ID:          uuid.New(),
			BatchID:     batch.ID, // this will be properly saved when batch is created in same tx if ID is pre-generated (we use gorm default gen_random_uuid)
			Action:      "CREATED",
			Changes:     "Batch produksi dibuat",
			PerformedBy: &createdBy,
			CreatedAt:   now,
		}
		if batch.ID == uuid.Nil {
			batch.ID = uuid.New()
			history.BatchID = batch.ID
		}
		batch.Histories = append(batch.Histories, history)

		var totalMaterialCost float64

		// 1. Setup Material Usages based on Recipe Version
		if batch.RecipeVersionID != uuid.Nil {
			var recipeVersion models.RTURecipeVersion
			if err := tx.Preload("Ingredients").Preload("Ingredients.Material").First(&recipeVersion, "id = ?", batch.RecipeVersionID).Error; err != nil {
				return err
			}
			
			// If ActualQty is provided during Create, scale the usage proportionally
			// Otherwise assume producing exactly 1 unit of ExpectedOutput (if defined)
			scaleFactor := 1.0
			var newUsages []models.RTUMaterialUsage
			if recipeVersion.ExpectedOutput > 0 && batch.ActualQty > 0 {
				scaleFactor = batch.ActualQty / recipeVersion.ExpectedOutput
			}
			
			for _, ing := range recipeVersion.Ingredients {
				calculatedQty := ing.Qty * scaleFactor
				
				// Determine if there is an override for this ingredient
				selectedMaterialID := ing.MaterialID
				for _, mu := range batch.MaterialUsages {
					if mu.RecipeIngredientID != nil && *mu.RecipeIngredientID == ing.ID {
						selectedMaterialID = mu.MaterialID
						break
					}
				}

				// Look up the material price for the selected material
				var selectedMaterial models.RTUMaterial
				if err := tx.First(&selectedMaterial, "id = ?", selectedMaterialID).Error; err != nil {
					return fmt.Errorf("failed to get selected material %s: %w", selectedMaterialID, err)
				}

				usage := models.RTUMaterialUsage{
					BatchID:    batch.ID, // Will be generated if zero, but we rely on gorm association below
					RecipeIngredientID: &ing.ID,
					MaterialID: selectedMaterialID,
					PlannedQty: calculatedQty,
					ActualQty:  calculatedQty, // Auto-complete uses calculated planned qty as actual
					Unit:       ing.Unit,
					UnitCost:   selectedMaterial.CurrentPrice,
					TotalCost:  0, // Re-calculated after FIFO
				}

				// Consume via FIFO
				actualFIFOCost, err := ConsumeFIFO(tx, batch.OutletID, ing.MaterialID, false, calculatedQty, "PRODUCTION_BATCH", batch.ID, now)
				if err != nil {
					return fmt.Errorf("failed to consume material %s via FIFO: %w", ing.MaterialID, err)
				}

				usage.TotalCost = actualFIFOCost
				if calculatedQty > 0 {
					usage.UnitCost = actualFIFOCost / calculatedQty
				}
				totalMaterialCost += usage.TotalCost

				// Clear old slice and append to a new one (we don't want to double append)
				newUsages = append(newUsages, usage)

				// Substract Material Stock from specific Outlet
				var outletStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", selectedMaterialID, batch.OutletID).First(&outletStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						outletStock = models.RTUOutletMaterialStock{
							MaterialID:   selectedMaterialID,
							OutletID:     batch.OutletID,
							CurrentStock: 0,
							MinStock:     0,
						}
						if err := tx.Create(&outletStock).Error; err != nil {
							return fmt.Errorf("failed to create outlet stock for material %s: %w", selectedMaterialID, err)
						}
					} else {
						return fmt.Errorf("failed to get outlet stock for material %s: %w", selectedMaterialID, err)
					}
				}

				newStock := outletStock.CurrentStock - calculatedQty

				ledgerEntry := models.RTUStockLedger{
					MaterialID:   &selectedMaterialID,
					OutletID:     batch.OutletID,
					MovementType: "OUT",
					Qty:          calculatedQty,
					Unit:         ing.Unit,
					RefType:      "PRODUCTION_BATCH",
					RefID:        &batch.ID,
					BalanceAfter: newStock,
					PriceAtTime:  usage.UnitCost,
					Notes:        &batch.BatchNumber,
					CreatedBy:    &createdBy,
					CreatedAt:    now,
				}
				if err := tx.Create(&ledgerEntry).Error; err != nil {
					return err
				}

				outletStock.CurrentStock = newStock
				if err := tx.Save(&outletStock).Error; err != nil {
					return err
				}
			}
			batch.MaterialUsages = newUsages
		}

		batch.TotalMaterialCost = totalMaterialCost
		batch.TotalCost = totalMaterialCost

		actQty := batch.ActualQty
		if actQty > 0 {
			unitCost := batch.TotalCost / actQty
			batch.UnitCost = &unitCost
		}

		// Save the batch first to get its ID before creating dependent records if needed
		if err := tx.Create(batch).Error; err != nil {
			return err
		}

		// 2. Increment Product Stock in specific Outlet
		var outletProductStock models.RTUOutletProductStock
		if err := tx.Where("product_id = ? AND outlet_id = ?", batch.ProductID, batch.OutletID).First(&outletProductStock).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				outletProductStock = models.RTUOutletProductStock{
					ProductID:    batch.ProductID,
					OutletID:     batch.OutletID,
					CurrentStock: 0,
				}
				if err := tx.Create(&outletProductStock).Error; err != nil {
					return fmt.Errorf("failed to create outlet product stock: %w", err)
				}
			} else {
				return fmt.Errorf("failed to get outlet product stock: %w", err)
			}
		}
		outletProductStock.CurrentStock += actQty
		if err := tx.Save(&outletProductStock).Error; err != nil {
			return fmt.Errorf("failed to update outlet product stock: %w", err)
		}

		// 3. Create FIFO Stock Lot for the produced product
		var unitCostVal float64
		if batch.UnitCost != nil {
			unitCostVal = *batch.UnitCost
		}
		prodLotNumber := fmt.Sprintf("LOT-PRD-%s-%s-%s", now.Format("20060102"), batch.BatchNumber, uuid.New().String()[:6])
		newProdLot := models.RTUStockLot{
			ID:           uuid.New(),
			ProductID:    &batch.ProductID,
			OutletID:     batch.OutletID,
			LotNumber:    prodLotNumber,
			QtyInitial:   actQty,
			QtyRemaining: actQty,
			UnitPrice:    unitCostVal,
			RefType:      "PRODUCTION_BATCH",
			RefID:        batch.ID,
			ReceivedDate: now,
		}

		if err := ReconcileNewLot(tx, &newProdLot); err != nil {
			return fmt.Errorf("failed to reconcile product lot: %w", err)
		}

		if err := tx.Create(&newProdLot).Error; err != nil {
			return fmt.Errorf("failed to create product stock lot: %w", err)
		}

		return nil
	})
}

func (s *rtuProductionBatchService) UpdateBatch(ctx context.Context, batchID uuid.UUID, input *models.RTUProductionBatch, updatedBy uuid.UUID) error {
	existing, err := s.batchRepo.FindByID(ctx, batchID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("batch not found")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		oldBatch := *existing
		now := time.Now()
		oldQty := existing.ActualQty
		unit := ""
		if existing.Product != nil {
			unit = existing.Product.OutputUnit
		}

		// If it was completed, we MUST revert the old stock movements first
		if existing.Status == models.BatchStatusCompleted {
			// Safety check: Make sure the produced lot has not been consumed yet
			var oldLot models.RTUStockLot
			if err := tx.Where("ref_type = ? AND ref_id = ?", "PRODUCTION_BATCH", existing.ID).First(&oldLot).Error; err == nil {
				if oldLot.QtyRemaining < oldLot.QtyInitial {
					return fmt.Errorf("tidak dapat mengubah batch: produk hasil produksi sudah terpakai atau terjual")
				}
				// Delete the old lot to clean up
				if err := tx.Delete(&oldLot).Error; err != nil {
					return fmt.Errorf("failed to delete old product stock lot: %w", err)
				}
			}

			// 1. Revert Finished Product Stock (Deduct from outlet product stock)
			if oldQty > 0 {
				var prodStock models.RTUOutletProductStock
				if err := tx.Where("product_id = ? AND outlet_id = ?", existing.ProductID, existing.OutletID).First(&prodStock).Error; err == nil {
					prodStock.CurrentStock -= oldQty
					if err := tx.Save(&prodStock).Error; err != nil {
						return fmt.Errorf("failed to deduct old product stock: %w", err)
					}
				}
				// Create a stock movement ledger for the voided product
				ledgerProduct := models.RTUStockLedger{
					ProductID:    &existing.ProductID,
					OutletID:     existing.OutletID,
					MovementType: "OUT",
					Qty:          oldQty,
					Unit:         unit,
					RefType:      "VOID_PRODUCTION_BATCH",
					RefID:        &existing.ID,
					BalanceAfter: 0,
					Notes:        &existing.BatchNumber,
					CreatedBy:    &updatedBy,
					CreatedAt:    now,
				}
				// Try to get balance after
				var latestProductStock models.RTUOutletProductStock
				if err := tx.Where("product_id = ? AND outlet_id = ?", existing.ProductID, existing.OutletID).First(&latestProductStock).Error; err == nil {
					ledgerProduct.BalanceAfter = latestProductStock.CurrentStock
				}
				if err := tx.Create(&ledgerProduct).Error; err != nil {
					return err
				}
			}

			// 2. Revert Raw Materials (Put back to stock)
			for idx, usage := range existing.MaterialUsages {
				if usage.ActualQty <= 0 {
					continue
				}

				// Get or create Outlet Stock
				var matStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", usage.MaterialID, existing.OutletID).First(&matStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						matStock = models.RTUOutletMaterialStock{
							MaterialID:   usage.MaterialID,
							OutletID:     existing.OutletID,
							CurrentStock: 0,
						}
						tx.Create(&matStock)
					} else {
						return err
					}
				}
				
				matStock.CurrentStock += usage.ActualQty
				if err := tx.Save(&matStock).Error; err != nil {
					return err
				}

				// Ledger IN for Void Raw Materials
				ledgerEntry := models.RTUStockLedger{
					MaterialID:   &usage.MaterialID,
					OutletID:     existing.OutletID,
					MovementType: "IN",
					Qty:          usage.ActualQty,
					Unit:         usage.Unit,
					RefType:      "VOID_PRODUCTION_BATCH",
					RefID:        &existing.ID,
					BalanceAfter: matStock.CurrentStock,
					PriceAtTime:  usage.UnitCost,
					Notes:        &existing.BatchNumber,
					CreatedBy:    &updatedBy,
					CreatedAt:    now,
				}
				if err := tx.Create(&ledgerEntry).Error; err != nil {
					return err
				}

				// Create Lot for returned material
				returnLot := models.RTUStockLot{
					ID:           uuid.New(),
					MaterialID:   &usage.MaterialID,
					OutletID:     existing.OutletID,
					LotNumber:    fmt.Sprintf("LOT-RTN-%s-%s-%s-M%d", now.Format("20060102"), existing.BatchNumber, uuid.New().String()[:6], idx+1),
					QtyInitial:   usage.ActualQty,
					QtyRemaining: usage.ActualQty,
					UnitPrice:    usage.UnitCost,
					RefType:      "VOID_PRODUCTION_BATCH",
					RefID:        existing.ID,
					ReceivedDate: now,
				}
				
				if err := ReconcileNewLot(tx, &returnLot); err != nil {
					return err
				}
				if err := tx.Create(&returnLot).Error; err != nil {
					return err
				}
			}

			// Clean up old material usage database records
			if err := tx.Where("batch_id = ?", existing.ID).Delete(&models.RTUMaterialUsage{}).Error; err != nil {
				return fmt.Errorf("failed to clear old material usages: %w", err)
			}
		}

		// Apply updated fields to existing record
		existing.ProductID = input.ProductID
		existing.OutletID = input.OutletID
		existing.PlannedDate = input.PlannedDate
		existing.Notes = input.Notes
		existing.ActualQty = input.ActualQty
		existing.UpdatedBy = &updatedBy
		existing.UpdatedAt = now

		// If it was completed, we MUST re-process using the new values
		if existing.Status == models.BatchStatusCompleted {
			if input.RecipeVersionID != uuid.Nil {
				existing.RecipeVersionID = input.RecipeVersionID
			}

			var recipeVersion models.RTURecipeVersion
			if err := tx.Preload("Ingredients").Preload("Ingredients.Material").First(&recipeVersion, "id = ?", existing.RecipeVersionID).Error; err != nil {
				return err
			}
			
			scaleFactor := 1.0
			var newUsages []models.RTUMaterialUsage
			if recipeVersion.ExpectedOutput > 0 && existing.ActualQty > 0 {
				scaleFactor = existing.ActualQty / recipeVersion.ExpectedOutput
			}
			
			var totalMaterialCost float64

			for _, ing := range recipeVersion.Ingredients {
				calculatedQty := ing.Qty * scaleFactor
				
				// Determine if there is an override for this ingredient in the input
				selectedMaterialID := ing.MaterialID
				for _, mu := range input.MaterialUsages {
					if mu.RecipeIngredientID != nil && *mu.RecipeIngredientID == ing.ID {
						selectedMaterialID = mu.MaterialID
						break
					}
				}

				// Look up the material price for the selected material
				var selectedMaterial models.RTUMaterial
				if err := tx.First(&selectedMaterial, "id = ?", selectedMaterialID).Error; err != nil {
					return fmt.Errorf("failed to get selected material %s: %w", selectedMaterialID, err)
				}

				usage := models.RTUMaterialUsage{
					ID:                 uuid.New(),
					BatchID:            existing.ID,
					RecipeIngredientID: &ing.ID,
					MaterialID:         selectedMaterialID,
					PlannedQty:         calculatedQty,
					ActualQty:          calculatedQty,
					Unit:               ing.Unit,
					UnitCost:           selectedMaterial.CurrentPrice,
					TotalCost:          0,
				}

				// Consume via FIFO
				actualFIFOCost, err := ConsumeFIFO(tx, existing.OutletID, selectedMaterialID, false, calculatedQty, "PRODUCTION_BATCH", existing.ID, now)
				if err != nil {
					return fmt.Errorf("failed to consume material %s via FIFO: %w", selectedMaterialID, err)
				}

				usage.TotalCost = actualFIFOCost
				if calculatedQty > 0 {
					usage.UnitCost = actualFIFOCost / calculatedQty
				}
				totalMaterialCost += usage.TotalCost
				newUsages = append(newUsages, usage)

				// Substract Material Stock from Outlet
				var outletStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", selectedMaterialID, existing.OutletID).First(&outletStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						outletStock = models.RTUOutletMaterialStock{
							MaterialID:   selectedMaterialID,
							OutletID:     existing.OutletID,
							CurrentStock: 0,
						}
						if err := tx.Create(&outletStock).Error; err != nil {
							return fmt.Errorf("failed to create outlet stock: %w", err)
						}
					} else {
						return err
					}
				}

				newStock := outletStock.CurrentStock - calculatedQty
				ledgerEntry := models.RTUStockLedger{
					MaterialID:   &selectedMaterialID,
					OutletID:     existing.OutletID,
					MovementType: "OUT",
					Qty:          calculatedQty,
					Unit:         ing.Unit,
					RefType:      "PRODUCTION_BATCH",
					RefID:        &existing.ID,
					BalanceAfter: newStock,
					PriceAtTime:  usage.UnitCost,
					Notes:        &existing.BatchNumber,
					CreatedBy:    &updatedBy,
					CreatedAt:    now,
				}
				if err := tx.Create(&ledgerEntry).Error; err != nil {
					return err
				}

				outletStock.CurrentStock = newStock
				if err := tx.Save(&outletStock).Error; err != nil {
					return err
				}
			}

			// Create the new material usage records in database
			for i := range newUsages {
				if err := tx.Create(&newUsages[i]).Error; err != nil {
					return fmt.Errorf("failed to save material usage: %w", err)
				}
			}

			existing.MaterialUsages = newUsages
			existing.TotalMaterialCost = totalMaterialCost
			existing.TotalCost = totalMaterialCost

			if existing.ActualQty > 0 {
				unitCost := existing.TotalCost / existing.ActualQty
				existing.UnitCost = &unitCost
			}

			// Increment Product Stock in specific Outlet
			var outletProductStock models.RTUOutletProductStock
			if err := tx.Where("product_id = ? AND outlet_id = ?", existing.ProductID, existing.OutletID).First(&outletProductStock).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					outletProductStock = models.RTUOutletProductStock{
						ProductID:    existing.ProductID,
						OutletID:     existing.OutletID,
						CurrentStock: 0,
					}
					if err := tx.Create(&outletProductStock).Error; err != nil {
						return fmt.Errorf("failed to create outlet product stock: %w", err)
					}
				} else {
					return fmt.Errorf("failed to get outlet product stock: %w", err)
				}
			}
			outletProductStock.CurrentStock += existing.ActualQty
			if err := tx.Save(&outletProductStock).Error; err != nil {
				return fmt.Errorf("failed to update outlet product stock: %w", err)
			}

			// Create FIFO Stock Lot for the produced product
			var unitCostVal float64
			if existing.UnitCost != nil {
				unitCostVal = *existing.UnitCost
			}
			prodLotNumber := fmt.Sprintf("LOT-PRD-%s-%s-%s", now.Format("20060102"), existing.BatchNumber, uuid.New().String()[:6])
			newProdLot := models.RTUStockLot{
				ID:           uuid.New(),
				ProductID:    &existing.ProductID,
				OutletID:     existing.OutletID,
				LotNumber:    prodLotNumber,
				QtyInitial:   existing.ActualQty,
				QtyRemaining: existing.ActualQty,
				UnitPrice:    unitCostVal,
				RefType:      "PRODUCTION_BATCH",
				RefID:        existing.ID,
				ReceivedDate: now,
			}

			if err := ReconcileNewLot(tx, &newProdLot); err != nil {
				return fmt.Errorf("failed to reconcile product lot: %w", err)
			}

			if err := tx.Create(&newProdLot).Error; err != nil {
				return fmt.Errorf("failed to create product stock lot: %w", err)
			}

			// Also write ledger for new product produced
			newProductLedger := models.RTUStockLedger{
				ProductID:    &existing.ProductID,
				OutletID:     existing.OutletID,
				MovementType: "IN",
				Qty:          existing.ActualQty,
				Unit:         unit,
				RefType:      "PRODUCTION_BATCH",
				RefID:        &existing.ID,
				BalanceAfter: outletProductStock.CurrentStock,
				PriceAtTime:  unitCostVal,
				Notes:        &existing.BatchNumber,
				CreatedBy:    &updatedBy,
				CreatedAt:    now,
			}
			if err := tx.Create(&newProductLedger).Error; err != nil {
				return err
			}
		}

		changesMsg := repositories.CompareProductionBatchChanges(&oldBatch, existing)
		
		history := models.RTUProductionBatchHistory{
			ID:          uuid.New(),
			BatchID:     batchID,
			Action:      "UPDATED",
			Changes:     changesMsg,
			PerformedBy: &updatedBy,
			CreatedAt:   now,
		}
		
		// Omit read-only master fields to prevent GORM from updating them
		if err := tx.Omit("Product", "Outlet", "RecipeVersion", "MaterialUsages.Material").Save(existing).Error; err != nil {
			return err
		}
		
		return tx.Create(&history).Error
	})
}

func (s *rtuProductionBatchService) DeleteBatch(ctx context.Context, batchID uuid.UUID, deletedBy uuid.UUID) error {
	existing, err := s.batchRepo.FindByID(ctx, batchID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("batch not found")
	}

	// Always cancel first to revert stocks if it was completed
	if existing.Status != models.BatchStatusCancelled {
		err = s.CancelBatch(ctx, batchID, deletedBy, "Batch dihapus")
		if err != nil {
			return err
		}
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		existing.IsDeleted = true
		existing.DeletedAt = &now
		existing.UpdatedAt = now
		
		history := models.RTUProductionBatchHistory{
			ID:          uuid.New(),
			BatchID:     batchID,
			Action:      "DELETED",
			Changes:     "Batch dihapus (Soft delete)",
			PerformedBy: &deletedBy,
			CreatedAt:   now,
		}
		
		batchRepoTx := s.batchRepo.WithTransaction(tx)
		if err := batchRepoTx.Update(ctx, existing); err != nil {
			return err
		}
		
		return tx.Create(&history).Error
	})
}

func (s *rtuProductionBatchService) automaticCompleteBatch(ctx context.Context, batch *models.RTUProductionBatch, createdBy uuid.UUID, estimatedTotalMaterialCost float64, monthlyHPP models.RTUMonthlyHPP) error {
	// Calculate proportional HPP
	hppRatio := 0.0
	if monthlyHPP.TotalMaterialCost > 0 {
		hppRatio = estimatedTotalMaterialCost / monthlyHPP.TotalMaterialCost
	}
	laborCost := monthlyHPP.TotalLaborCost * hppRatio
	overheadCost := monthlyHPP.TotalOverheadCost * hppRatio

	if err := s.batchRepo.Create(ctx, batch); err != nil {
		return err
	}

	// Prepare completed batch payload
	completedBatch := &models.RTUProductionBatch{
		ID:             batch.ID,
		ActualQty:      batch.ActualQty,
		Notes:          batch.Notes,
		MaterialUsages: batch.MaterialUsages,
		LaborItems: []models.RTULaborItem{
			{WorkerCount: 1, HoursWorked: 1, RatePerHour: laborCost},
		},
		OverheadItems: []models.RTUOverheadItem{
			{Description: "Overhead Bulanan (Proporsional)", Cost: overheadCost},
		},
	}

	if err := s.CompleteBatch(ctx, completedBatch, createdBy); err != nil {
		return fmt.Errorf("failed to complete batch automatically: %w", err)
	}

	return nil
}

func (s *rtuProductionBatchService) RecalculateHPPForMonth(ctx context.Context, outletID uuid.UUID, monthYear string, hpp models.RTUMonthlyHPP) error {
	// monthYear is in format "YYYY-MM"
	parsedTime, err := time.Parse("2006-01", monthYear)
	if err != nil {
		return err
	}
	startOfMonth := parsedTime
	startOfNextMonth := parsedTime.AddDate(0, 1, 0)

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var batches []models.RTUProductionBatch
		if err := tx.Where("outlet_id = ? AND planned_date >= ? AND planned_date < ?", outletID, startOfMonth, startOfNextMonth).Find(&batches).Error; err != nil {
			return err
		}

		// Calculate the dynamic Total Material Cost for the month from all batches
		var calculatedMonthlyMaterialCost float64
		for _, batch := range batches {
			calculatedMonthlyMaterialCost += batch.TotalMaterialCost
		}

		// Update the HPP record in DB so it reflects the real total material usage
		hpp.TotalMaterialCost = calculatedMonthlyMaterialCost
		if err := tx.Save(&hpp).Error; err != nil {
			return err
		}

		for _, batch := range batches {
			hppRatio := 0.0
			if hpp.TotalMaterialCost > 0 {
				hppRatio = batch.TotalMaterialCost / hpp.TotalMaterialCost
			}
			laborCost := hpp.TotalLaborCost * hppRatio
			overheadCost := hpp.TotalOverheadCost * hppRatio

			// Delete existing labor/overhead
			if err := tx.Where("batch_id = ?", batch.ID).Delete(&models.RTULaborItem{}).Error; err != nil {
				return err
			}
			if err := tx.Where("batch_id = ?", batch.ID).Delete(&models.RTUOverheadItem{}).Error; err != nil {
				return err
			}

			// Insert new labor/overhead
			newLabor := models.RTULaborItem{
				ID:          uuid.New(),
				BatchID:     batch.ID,
				WorkerCount: 1,
				HoursWorked: 1,
				RatePerHour: laborCost,
				TotalCost:   laborCost,
			}
			if err := tx.Create(&newLabor).Error; err != nil {
				return err
			}

			newOverhead := models.RTUOverheadItem{
				ID:          uuid.New(),
				BatchID:     batch.ID,
				Description: "Overhead Bulanan (Proporsional)",
				Cost:        overheadCost,
			}
			if err := tx.Create(&newOverhead).Error; err != nil {
				return err
			}

			// Update batch totals
			batch.TotalLaborCost = laborCost
			batch.TotalOverheadCost = overheadCost
			batch.TotalCost = batch.TotalMaterialCost + laborCost + overheadCost
			if err := tx.Save(&batch).Error; err != nil {
				return err
			}
		}

		return nil
	})
}


func (s *rtuProductionBatchService) StartBatch(ctx context.Context, batchID uuid.UUID, updatedBy uuid.UUID) error {
	batch, err := s.batchRepo.FindByID(ctx, batchID)
	if err != nil {
		return err
	}
	if batch == nil {
		return errors.New("batch not found")
	}
	if batch.Status != models.BatchStatusPlanned {
		return fmt.Errorf("cannot start batch with status: %s", batch.Status)
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		batch.Status = models.BatchStatusInProgress
		batch.UpdatedBy = &updatedBy
		batch.UpdatedAt = time.Now()
		
		history := models.RTUProductionBatchHistory{
			ID:          uuid.New(),
			BatchID:     batchID,
			Action:      "STARTED",
			Changes:     "Produksi dimulai",
			PerformedBy: &updatedBy,
			CreatedAt:   batch.UpdatedAt,
		}
		
		batchRepoTx := s.batchRepo.WithTransaction(tx)
		if err := batchRepoTx.Update(ctx, batch); err != nil {
			return err
		}
		
		return tx.Create(&history).Error
	})
}

func (s *rtuProductionBatchService) CompleteBatch(ctx context.Context, inputBatch *models.RTUProductionBatch, completedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		batchRepoTx := s.batchRepo.WithTransaction(tx)

		batch, err := batchRepoTx.FindByID(ctx, inputBatch.ID)
		if err != nil {
			return err
		}
		if batch == nil {
			return errors.New("batch not found")
		}
		if batch.Status != models.BatchStatusInProgress {
			return fmt.Errorf("cannot complete batch with status: %s", batch.Status)
		}

		// Gunakan PlannedDate sebagai tanggal transaksi agar sinkron dengan input user
		now := batch.PlannedDate
		
		batch.Status = models.BatchStatusCompleted
		batch.UpdatedBy = &completedBy
		batch.CompletedDate = &now
		batch.ActualQty = inputBatch.ActualQty
		batch.Notes = inputBatch.Notes
		batch.UpdatedAt = time.Now()
		
		history := models.RTUProductionBatchHistory{
			ID:          uuid.New(),
			BatchID:     batch.ID,
			Action:      "COMPLETED",
			Changes:     fmt.Sprintf("Produksi diselesaikan dengan hasil akhir %v", batch.ActualQty),
			PerformedBy: &completedBy,
			CreatedAt:   batch.UpdatedAt,
		}
		
		if err := tx.Create(&history).Error; err != nil {
			return fmt.Errorf("failed to create history log: %w", err)
		}

		// 1. Process Material Usages overrides & Deduct stock
		// Using the incoming inputBatch material usages for actual values
		var totalMaterialCost float64
		
		for _, inputUsage := range inputBatch.MaterialUsages {
			// Find existing usage or add new if unexpected material was used
			var existingUsage *models.RTUMaterialUsage
			for i, bu := range batch.MaterialUsages {
				if bu.ID == inputUsage.ID || bu.MaterialID == inputUsage.MaterialID {
					existingUsage = &batch.MaterialUsages[i]
					break
				}
			}

			if existingUsage != nil {
				existingUsage.ActualQty = inputUsage.ActualQty
				// Consume via FIFO
				actualFIFOCost, err := ConsumeFIFO(tx, batch.OutletID, existingUsage.MaterialID, false, existingUsage.ActualQty, "PRODUCTION_BATCH", batch.ID, now)
				if err != nil {
					return fmt.Errorf("failed to consume material %s via FIFO: %w", existingUsage.MaterialID, err)
				}
				existingUsage.TotalCost = actualFIFOCost
				if existingUsage.ActualQty > 0 {
					existingUsage.UnitCost = actualFIFOCost / existingUsage.ActualQty
				}
				totalMaterialCost += existingUsage.TotalCost
			} else {
				// Unexpected material used
				var material models.RTUMaterial
				if err := tx.Where("id = ?", inputUsage.MaterialID).First(&material).Error; err == nil {
					// Consume via FIFO
					actualFIFOCost, err := ConsumeFIFO(tx, batch.OutletID, material.ID, false, inputUsage.ActualQty, "PRODUCTION_BATCH", batch.ID, now)
					if err != nil {
						return fmt.Errorf("failed to consume unexpected material %s via FIFO: %w", material.ID, err)
					}
					newUsage := models.RTUMaterialUsage{
						BatchID:    batch.ID,
						MaterialID: material.ID,
						PlannedQty: 0,
						ActualQty:  inputUsage.ActualQty,
						Unit:       material.Unit,
						TotalCost:  actualFIFOCost,
					}
					if inputUsage.ActualQty > 0 {
						newUsage.UnitCost = actualFIFOCost / inputUsage.ActualQty
					} else {
						newUsage.UnitCost = material.CurrentPrice
					}
					batch.MaterialUsages = append(batch.MaterialUsages, newUsage)
					totalMaterialCost += newUsage.TotalCost
					existingUsage = &batch.MaterialUsages[len(batch.MaterialUsages)-1]
				}
			}

			// 2. Substract Material Stock from specific Outlet
			if existingUsage != nil {
				// Get or Create Outlet Stock
				var outletStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", existingUsage.MaterialID, batch.OutletID).First(&outletStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						outletStock = models.RTUOutletMaterialStock{
							MaterialID:   existingUsage.MaterialID,
							OutletID:     batch.OutletID,
							CurrentStock: 0,
							MinStock:     0,
						}
						if err := tx.Create(&outletStock).Error; err != nil {
							return fmt.Errorf("failed to create outlet stock for material %s: %w", existingUsage.MaterialID, err)
						}
					} else {
						return fmt.Errorf("failed to get outlet stock for material %s: %w", existingUsage.MaterialID, err)
					}
				}

				newStock := outletStock.CurrentStock - existingUsage.ActualQty

				ledgerEntry := models.RTUStockLedger{
					MaterialID:   &existingUsage.MaterialID,
					OutletID:     batch.OutletID,
					MovementType: "OUT",
					Qty:          existingUsage.ActualQty,
					Unit:         existingUsage.Unit,
					RefType:      "PRODUCTION_BATCH",
					RefID:        &batch.ID,
					BalanceAfter: newStock,
					PriceAtTime:  existingUsage.UnitCost,
					Notes:        &batch.BatchNumber,
					CreatedBy:    &completedBy,
					CreatedAt:    now,
				}
				if err := tx.Create(&ledgerEntry).Error; err != nil {
					return err
				}

				outletStock.CurrentStock = newStock
				if err := tx.Save(&outletStock).Error; err != nil {
					return err
				}
			}
		}

			// 2. Process Labor items
			var totalLaborCost float64
			// Clear existing and replace with input
			if err := tx.Where("batch_id = ?", batch.ID).Delete(&models.RTULaborItem{}).Error; err != nil {
				return err
			}
			batch.LaborItems = nil // Clear preloaded slice to prevent duplicates on Save
			for i := range inputBatch.LaborItems {
				item := inputBatch.LaborItems[i]
				item.ID = uuid.New()
				item.BatchID = batch.ID
				item.TotalCost = float64(item.WorkerCount) * item.HoursWorked * item.RatePerHour
				batch.LaborItems = append(batch.LaborItems, item)
				totalLaborCost += item.TotalCost
			}

			// 3. Process Overhead items
			var totalOverheadCost float64
			// Clear existing
			if err := tx.Where("batch_id = ?", batch.ID).Delete(&models.RTUOverheadItem{}).Error; err != nil {
				return err
			}
			batch.OverheadItems = nil // Clear preloaded slice to prevent duplicates on Save
			for i := range inputBatch.OverheadItems {
				item := inputBatch.OverheadItems[i]
				item.ID = uuid.New()
				item.BatchID = batch.ID
				batch.OverheadItems = append(batch.OverheadItems, item)
				totalOverheadCost += item.Cost
			}

			// 4. Summarize costing
			batch.TotalMaterialCost = totalMaterialCost
			batch.TotalLaborCost = totalLaborCost
			batch.TotalOverheadCost = totalOverheadCost
			batch.TotalCost = totalMaterialCost + totalLaborCost + totalOverheadCost

			actQty := batch.ActualQty
			if actQty > 0 {
				unitCost := batch.TotalCost / actQty
				batch.UnitCost = &unitCost
			}

			// 5. Increment Product Stock in specific Outlet
			var outletProductStock models.RTUOutletProductStock
			if err := tx.Where("product_id = ? AND outlet_id = ?", batch.ProductID, batch.OutletID).First(&outletProductStock).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					outletProductStock = models.RTUOutletProductStock{
						ProductID:    batch.ProductID,
						OutletID:     batch.OutletID,
						CurrentStock: 0,
					}
					if err := tx.Create(&outletProductStock).Error; err != nil {
						return fmt.Errorf("failed to create outlet product stock: %w", err)
					}
				} else {
					return fmt.Errorf("failed to get outlet product stock: %w", err)
				}
			}
			outletProductStock.CurrentStock += actQty
			if err := tx.Save(&outletProductStock).Error; err != nil {
				return fmt.Errorf("failed to update outlet product stock: %w", err)
			}

			// 6. Create FIFO Stock Lot for the produced product
			var unitCostVal float64
			if batch.UnitCost != nil {
				unitCostVal = *batch.UnitCost
			}
			prodLotNumber := fmt.Sprintf("LOT-PRD-%s-%s-%s", now.Format("20060102"), batch.BatchNumber, uuid.New().String()[:6])
			newProdLot := models.RTUStockLot{
				ID:           uuid.New(),
				ProductID:    &batch.ProductID,
				OutletID:     batch.OutletID,
				LotNumber:    prodLotNumber,
				QtyInitial:   actQty,
				QtyRemaining: actQty,
				UnitPrice:    unitCostVal,
				RefType:      "PRODUCTION_BATCH",
				RefID:        batch.ID,
				ReceivedDate: now,
			}

			if err := ReconcileNewLot(tx, &newProdLot); err != nil {
				return fmt.Errorf("failed to reconcile product lot: %w", err)
			}

			if err := tx.Create(&newProdLot).Error; err != nil {
				return fmt.Errorf("failed to create product stock lot: %w", err)
			}

			// Save the entire batch structure, omitting read-only master associations
			return tx.Omit("Product", "Outlet", "RecipeVersion", "MaterialUsages.Material").Save(batch).Error
	})
}

func (s *rtuProductionBatchService) CancelBatch(ctx context.Context, batchID uuid.UUID, cancelledBy uuid.UUID, reason string) error {
	batch, err := s.batchRepo.FindByID(ctx, batchID)
	if err != nil {
		return err
	}
	if batch == nil {
		return errors.New("batch not found")
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if batch.Status == models.BatchStatusCancelled {
			return fmt.Errorf("batch is already cancelled")
		}

		if batch.Status == models.BatchStatusCompleted {
			now := time.Now()
			
			// 1. Revert Raw Materials (Put back to stock)
			for idx, usage := range batch.MaterialUsages {
				if usage.ActualQty <= 0 {
					continue
				}

				// Get or create Outlet Stock
				var matStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", usage.MaterialID, batch.OutletID).First(&matStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						matStock = models.RTUOutletMaterialStock{
							MaterialID:   usage.MaterialID,
							OutletID:     batch.OutletID,
							CurrentStock: 0,
						}
						tx.Create(&matStock)
					} else {
						return err
					}
				}
				
				matStock.CurrentStock += usage.ActualQty
				if err := tx.Save(&matStock).Error; err != nil {
					return err
				}

				// Ledger IN for Void
				ledgerEntry := models.RTUStockLedger{
					MaterialID:   &usage.MaterialID,
					OutletID:     batch.OutletID,
					MovementType: "IN",
					Qty:          usage.ActualQty,
					Unit:         usage.Unit,
					RefType:      "VOID_PRODUCTION_BATCH",
					RefID:        &batch.ID,
					BalanceAfter: matStock.CurrentStock,
					PriceAtTime:  usage.UnitCost,
					Notes:        &batch.BatchNumber,
					CreatedBy:    &cancelledBy,
					CreatedAt:    now,
				}
				if err := tx.Create(&ledgerEntry).Error; err != nil {
					return err
				}

				// Create Lot for returned material
				returnLot := models.RTUStockLot{
					ID:           uuid.New(),
					MaterialID:   &usage.MaterialID,
					OutletID:     batch.OutletID,
					LotNumber:    fmt.Sprintf("LOT-RTN-%s-%s-%s-M%d", now.Format("20060102"), batch.BatchNumber, uuid.New().String()[:6], idx+1),
					QtyInitial:   usage.ActualQty,
					QtyRemaining: usage.ActualQty,
					UnitPrice:    usage.UnitCost,
					RefType:      "VOID_PRODUCTION_BATCH",
					RefID:        batch.ID,
					ReceivedDate: now,
				}
				
				if err := ReconcileNewLot(tx, &returnLot); err != nil {
					return err
				}
				if err := tx.Create(&returnLot).Error; err != nil {
					return err
				}
			}

			// 2. Revert Finished Product (Consume from stock, even if it goes negative)
			if batch.ActualQty > 0 {
				_, err := ConsumeFIFO(tx, batch.OutletID, batch.ProductID, true, batch.ActualQty, "VOID_PRODUCTION_BATCH", batch.ID, now)
				if err != nil {
					return fmt.Errorf("failed to revert finished product stock: %w", err)
				}
				
				var prodStock models.RTUOutletProductStock
				if err := tx.Where("product_id = ? AND outlet_id = ?", batch.ProductID, batch.OutletID).First(&prodStock).Error; err == nil {
					prodStock.CurrentStock -= batch.ActualQty
					tx.Save(&prodStock)
				}
			}
		}

		batch.Status = models.BatchStatusCancelled
		batch.UpdatedBy = &cancelledBy
		batch.UpdatedAt = time.Now()
		
		history := models.RTUProductionBatchHistory{
			ID:          uuid.New(),
			BatchID:     batch.ID,
			Action:      "CANCELLED",
			Changes:     "Produksi dibatalkan. Alasan: " + reason,
			PerformedBy: &cancelledBy,
			CreatedAt:   batch.UpdatedAt,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}
		
		batchRepoTx := s.batchRepo.WithTransaction(tx)
		return batchRepoTx.Update(ctx, batch)
	})
}
