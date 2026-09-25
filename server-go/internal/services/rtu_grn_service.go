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

type RTUGRNService interface {
	CreateGRN(ctx context.Context, grn *models.RTUGRN, createdBy uuid.UUID) error
	ConfirmGRN(ctx context.Context, grnID uuid.UUID, confirmedBy uuid.UUID) error
	CancelGRN(ctx context.Context, grnID uuid.UUID, cancelledBy uuid.UUID, reason string) error
	UpdateGRN(ctx context.Context, grnID uuid.UUID, input *models.RTUGRN, updatedBy uuid.UUID) error
}

type rtuGRNService struct {
	db           *gorm.DB
	grnRepo      repositories.RTUGRNRepository
	materialRepo repositories.RTUMaterialRepository
}

func NewRTUGRNService(db *gorm.DB, grnRepo repositories.RTUGRNRepository, materialRepo repositories.RTUMaterialRepository) RTUGRNService {
	return &rtuGRNService{
		db:           db,
		grnRepo:      grnRepo,
		materialRepo: materialRepo,
	}
}

func (s *rtuGRNService) CreateGRN(ctx context.Context, grn *models.RTUGRN, createdBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		grn.Status = "CONFIRMED"
		grn.CreatedBy = &createdBy
		grn.UpdatedBy = &createdBy

		var subtotal float64
		for i := range grn.Items {
			grn.Items[i].Subtotal = grn.Items[i].QtyReceived * grn.Items[i].UnitPrice
			subtotal += grn.Items[i].Subtotal
		}
		taxAmount := (subtotal * grn.TaxPercent) / 100
		grn.TotalAmount = subtotal + taxAmount

		// Generate IDs manually to prevent GORM zero-value foreign key bugs
		if grn.ID == uuid.Nil {
			grn.ID = uuid.New()
		}
		if grn.GRNNumber == "" {
			var abbrev string
			if grn.OutletID != uuid.Nil {
				var outlet models.Outlet
				if err := tx.Select("abbreviation").First(&outlet, "id = ?", grn.OutletID).Error; err == nil {
					if outlet.Abbreviation != nil && *outlet.Abbreviation != "" {
						abbrev = *outlet.Abbreviation
					}
				}
			}
			prefix := "GRN-"
			if abbrev != "" {
				prefix = fmt.Sprintf("GRN-%s-", abbrev)
			}
			dateStr := time.Now().Format("20060102")
			if !grn.ReceiptDate.IsZero() {
				dateStr = grn.ReceiptDate.Format("20060102")
			}
			grn.GRNNumber = fmt.Sprintf("%s%s-%s", prefix, dateStr, uuid.New().String()[:8])
		}

		for i := range grn.Items {
			if grn.Items[i].ID == uuid.Nil {
				grn.Items[i].ID = uuid.New()
			}
			grn.Items[i].GRNID = grn.ID
		}

		// Create header and items first
		grnRepoTx := s.grnRepo.WithTransaction(tx)
		if err := grnRepoTx.Create(ctx, grn); err != nil {
			return err
		}

		// Process each item (Update Outlet Stock & Update Price if changed)
		for _, item := range grn.Items {
			var material models.RTUMaterial
			if err := tx.Where("id = ? AND is_deleted = false", item.MaterialID).First(&material).Error; err != nil {
				return fmt.Errorf("failed to fetch material for item: %w", err)
			}

			// Get or Create Outlet Stock
			var outletStock models.RTUOutletMaterialStock
			if err := tx.Where("material_id = ? AND outlet_id = ?", material.ID, grn.OutletID).First(&outletStock).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					outletStock = models.RTUOutletMaterialStock{
						MaterialID:   material.ID,
						OutletID:     grn.OutletID,
						CurrentStock: 0,
						MinStock:     0,
					}
					if err := tx.Create(&outletStock).Error; err != nil {
						return fmt.Errorf("failed to create outlet stock: %w", err)
					}
				} else {
					return fmt.Errorf("failed to get outlet stock: %w", err)
				}
			}

			// Base quantities based on conversion
			conversionFactor := item.Conversion
			if conversionFactor <= 0 {
				conversionFactor = 1.0
			}
			baseQty := item.QtyReceived * conversionFactor
			basePrice := item.UnitPrice / conversionFactor

			// Add to stock ledger
			newStock := outletStock.CurrentStock + baseQty
			
			ledgerEntry := models.RTUStockLedger{
				MaterialID:   &material.ID,
				OutletID:     grn.OutletID,
				MovementType: "IN",
				Qty:          baseQty,
				Unit:         material.Unit, // Always record in Base Unit
				RefType:      "GRN",
				RefID:        &grn.ID,
				BalanceAfter: newStock,
				PriceAtTime:  basePrice,
				Notes:        &grn.GRNNumber,
				CreatedBy:    &createdBy,
				CreatedAt:    time.Now(),
			}
			if err := tx.Create(&ledgerEntry).Error; err != nil {
				return err
			}

			// Update Outlet Stock
			outletStock.CurrentStock = newStock
			if err := tx.Save(&outletStock).Error; err != nil {
				return err
			}

			// Create and reconcile FIFO Stock Lot
			lotNumber := fmt.Sprintf("LOT-MAT-%s-%s", time.Now().Format("20060102"), uuid.New().String()[:4])
			newLot := models.RTUStockLot{
				ID:           uuid.New(),
				MaterialID:   &material.ID,
				OutletID:     grn.OutletID,
				LotNumber:    lotNumber,
				QtyInitial:   baseQty,
				QtyRemaining: baseQty,
				UnitPrice:    basePrice,
				RefType:      "GRN",
				RefID:        grn.ID,
				ReceivedDate: grn.ReceiptDate,
			}

			if err := ReconcileNewLot(tx, &newLot); err != nil {
				return fmt.Errorf("failed to reconcile lot for material %s: %w", material.Name, err)
			}

			if err := tx.Create(&newLot).Error; err != nil {
				return fmt.Errorf("failed to create stock lot for material %s: %w", material.Name, err)
			}

			// Check if price changed or first time
			if basePrice != material.CurrentPrice {
				sourceDesc := "GRN Confirm " + grn.GRNNumber
				priceHistory := models.RTUMaterialPriceHistory{
					MaterialID:    material.ID,
					VendorID:      grn.VendorID,
					Price:         basePrice,
					EffectiveDate: grn.ReceiptDate,
					Source:        sourceDesc,
					CreatedBy:     &createdBy,
					CreatedAt:     time.Now(),
				}
				if err := tx.Create(&priceHistory).Error; err != nil {
					return err
				}

				now := time.Now()
				material.CurrentPrice = basePrice
				material.LastPriceDate = &now
				material.VendorID = grn.VendorID // Update global default vendor to recent
				
				if err := tx.Save(&material).Error; err != nil {
					return err
				}
			}
		}

		// Log History
		history := models.RTUGRNHistory{
			GRNID:       grn.ID,
			Action:      "CREATE_GRN",
			Changes:     "GRN created and automatically confirmed",
			PerformedBy: &createdBy,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		// If linked to a Purchase Order, check if it's fully received
		if grn.PurchaseID != nil {
			var po models.RTUPurchase
			if err := tx.Preload("Items").Where("id = ?", grn.PurchaseID).First(&po).Error; err != nil {
				return fmt.Errorf("failed to get PO: %w", err)
			}

			var confirmedGrns []models.RTUGRN
			if err := tx.Preload("Items").Where("purchase_id = ? AND status = ?", grn.PurchaseID, "CONFIRMED").Find(&confirmedGrns).Error; err != nil {
				return fmt.Errorf("failed to get confirmed GRNs: %w", err)
			}

			receivedMap := make(map[uuid.UUID]float64)
			for _, g := range confirmedGrns {
				for _, item := range g.Items {
					receivedMap[item.MaterialID] += item.QtyReceived
				}
			}

			isFullyReceived := true
			for _, poItem := range po.Items {
				if poItem.MaterialID != nil {
					if receivedMap[*poItem.MaterialID] < poItem.Qty {
						isFullyReceived = false
						break
					}
				}
			}

			newStatus := "PROCESSING"
			if isFullyReceived || po.Status == models.PurchaseStatusCompleted {
				newStatus = "COMPLETED"
			}

			if err := tx.Model(&models.RTUPurchase{}).Where("id = ?", grn.PurchaseID).Update("status", newStatus).Error; err != nil {
				return fmt.Errorf("failed to update purchase order status: %w", err)
			}
		}

		return nil
	})
}

func (s *rtuGRNService) logHistory(ctx context.Context, grnID uuid.UUID, action, changes string, performedBy uuid.UUID) {
	history := models.RTUGRNHistory{
		GRNID:       grnID,
		Action:      action,
		Changes:     changes,
		PerformedBy: &performedBy,
	}
	s.db.WithContext(ctx).Create(&history)
}

func (s *rtuGRNService) UpdateGRN(ctx context.Context, grnID uuid.UUID, input *models.RTUGRN, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		grnRepoTx := s.grnRepo.WithTransaction(tx)

		existing, err := grnRepoTx.FindByID(ctx, grnID)
		if err != nil {
			return err
		}
		oldGRN := *existing
		if existing == nil {
			return errors.New("document not found")
		}
		if existing.Status != "DRAFT" {
			return fmt.Errorf("cannot edit document in %s status", existing.Status)
		}

		// Delete existing items
		if err := tx.Where("grn_id = ?", grnID).Delete(&models.RTUGRNItem{}).Error; err != nil {
			return fmt.Errorf("failed to clean up old items: %w", err)
		}

		// Re-initialize items and recalculate
		var subtotal float64
		for i := range input.Items {
			input.Items[i].ID = uuid.New()
			input.Items[i].GRNID = grnID
			input.Items[i].Subtotal = input.Items[i].QtyReceived * input.Items[i].UnitPrice
			subtotal += input.Items[i].Subtotal

			if err := tx.Create(&input.Items[i]).Error; err != nil {
				return fmt.Errorf("failed to save item: %w", err)
			}
		}

		// Update fields
		existing.VendorID = input.VendorID
		existing.OutletID = input.OutletID
		existing.ReceiptDate = input.ReceiptDate
		existing.Notes = input.Notes
		existing.PaymentType = input.PaymentType
		existing.DPAmount = input.DPAmount
		existing.TaxPercent = input.TaxPercent
		existing.ShippingFee = input.ShippingFee
		existing.LoadingFee = input.LoadingFee
		existing.UnloadingFee = input.UnloadingFee
		existing.AdditionalCosts = input.AdditionalCosts

		taxAmount := (subtotal * input.TaxPercent) / 100
		serviceFees := input.ShippingFee + input.LoadingFee + input.UnloadingFee
		var customFees float64
		for _, c := range input.AdditionalCosts {
			customFees += c.Amount
		}
		existing.TotalAmount = subtotal + taxAmount + serviceFees + customFees
		existing.UpdatedBy = &updatedBy

		if err := tx.Omit("Items", "Vendor", "Outlet").Save(existing).Error; err != nil {
			return err
		}

		history := models.RTUGRNHistory{
			GRNID:       existing.ID,
			Action:      "UPDATE_GRN",
			Changes:     repositories.CompareGRNChanges(&oldGRN, existing),
			PerformedBy: &updatedBy,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		return nil
	})
}

func (s *rtuGRNService) ConfirmGRN(ctx context.Context, grnID uuid.UUID, confirmedBy uuid.UUID) error {
	// 1. Transaction Start
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		grnRepoTx := s.grnRepo.WithTransaction(tx)
		
		grn, err := grnRepoTx.FindByID(ctx, grnID)
		if err != nil {
			return err
		}
		if grn == nil {
			return errors.New("GRN not found")
		}
		if grn.Status != "DRAFT" {
			return fmt.Errorf("cannot confirm GRN with status: %s", grn.Status)
		}

			// Calculate totals and service fees for HPP apportionment
			totalServiceFees := grn.ShippingFee + grn.LoadingFee + grn.UnloadingFee
			for _, c := range grn.AdditionalCosts {
				totalServiceFees += c.Amount
			}
			var totalItemsSubtotal float64
			if totalServiceFees > 0 {
				for _, it := range grn.Items {
					totalItemsSubtotal += it.Subtotal
				}
			}

			// 3. Process each item (Update Outlet Stock & Update Price if changed)
			for _, item := range grn.Items {
				var material models.RTUMaterial
				if err := tx.Where("id = ? AND is_deleted = false", item.MaterialID).First(&material).Error; err != nil {
					return fmt.Errorf("failed to fetch material for item: %w", err)
				}

				// Get or Create Outlet Stock
				var outletStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", material.ID, grn.OutletID).First(&outletStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						outletStock = models.RTUOutletMaterialStock{
							MaterialID:   material.ID,
							OutletID:     grn.OutletID,
							CurrentStock: 0,
							MinStock:     0,
						}
						if err := tx.Create(&outletStock).Error; err != nil {
							return fmt.Errorf("failed to create outlet stock: %w", err)
						}
					} else {
						return fmt.Errorf("failed to get outlet stock: %w", err)
					}
				}

				// Base quantities based on conversion
				conversionFactor := item.Conversion
				if conversionFactor <= 0 {
					conversionFactor = 1.0
				}
				baseQty := item.QtyReceived * conversionFactor

				itemPrice := item.UnitPrice
				if totalServiceFees > 0 && totalItemsSubtotal > 0 {
					ratio := item.Subtotal / totalItemsSubtotal
					allocatedFee := ratio * totalServiceFees
					if item.QtyReceived > 0 {
						itemPrice += allocatedFee / item.QtyReceived
					}
				}
				basePrice := itemPrice / conversionFactor

				// Add to stock ledger
				newStock := outletStock.CurrentStock + baseQty
				
				ledgerEntry := models.RTUStockLedger{
					MaterialID:   &material.ID,
					OutletID:     grn.OutletID,
					MovementType: "IN",
					Qty:          baseQty,
					Unit:         material.Unit, // Always record in Base Unit
					RefType:      "GRN",
					RefID:        &grn.ID,
					BalanceAfter: newStock,
					PriceAtTime:  basePrice,
					Notes:        &grn.GRNNumber,
					CreatedBy:    &confirmedBy,
					CreatedAt:    time.Now(),
				}
				if err := tx.Create(&ledgerEntry).Error; err != nil {
					return err
				}

				// Update Outlet Stock
				outletStock.CurrentStock = newStock
				if err := tx.Save(&outletStock).Error; err != nil {
					return err
				}

				// Create and reconcile FIFO Stock Lot
				lotNumber := fmt.Sprintf("LOT-MAT-%s-%s", time.Now().Format("20060102"), uuid.New().String()[:4])
				newLot := models.RTUStockLot{
					ID:           uuid.New(),
					MaterialID:   &material.ID,
					OutletID:     grn.OutletID,
					LotNumber:    lotNumber,
					QtyInitial:   baseQty,
					QtyRemaining: baseQty,
					UnitPrice:    basePrice,
					RefType:      "GRN",
					RefID:        grn.ID,
					ReceivedDate: grn.ReceiptDate,
				}

				if err := ReconcileNewLot(tx, &newLot); err != nil {
					return fmt.Errorf("failed to reconcile lot for material %s: %w", material.Name, err)
				}

				if err := tx.Create(&newLot).Error; err != nil {
					return fmt.Errorf("failed to create stock lot for material %s: %w", material.Name, err)
				}

				// Check if price changed or first time
				if basePrice != material.CurrentPrice {
					sourceDesc := "GRN Confirm " + grn.GRNNumber
					priceHistory := models.RTUMaterialPriceHistory{
						MaterialID:    material.ID,
						VendorID:      grn.VendorID,
						Price:         basePrice,
						EffectiveDate: grn.ReceiptDate,
						Source:        sourceDesc,
						CreatedBy:     &confirmedBy,
						CreatedAt:     time.Now(),
					}
					if err := tx.Create(&priceHistory).Error; err != nil {
						return err
					}

					now := time.Now()
					material.CurrentPrice = basePrice
					material.LastPriceDate = &now
					material.VendorID = grn.VendorID // Update global default vendor to recent
					
					if err := tx.Save(&material).Error; err != nil {
						return err
					}
				}
			}

		oldGRN := *grn
		// 3. Update GRN status
		grn.Status = "CONFIRMED"
		grn.UpdatedBy = &confirmedBy
		if err := tx.Omit("Items", "Vendor", "Outlet").Save(grn).Error; err != nil {
			return err
		}

		history := models.RTUGRNHistory{
			GRNID:       grn.ID,
			Action:      "CONFIRM_GRN",
			Changes:     repositories.CompareGRNChanges(&oldGRN, grn),
			PerformedBy: &confirmedBy,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		// 4. If linked to a Purchase Order, check if it's fully received
		if grn.PurchaseID != nil {
			var po models.RTUPurchase
			if err := tx.Preload("Items").Where("id = ?", grn.PurchaseID).First(&po).Error; err != nil {
				return fmt.Errorf("failed to get PO: %w", err)
			}

			var confirmedGrns []models.RTUGRN
			if err := tx.Preload("Items").Where("purchase_id = ? AND status = ?", grn.PurchaseID, "CONFIRMED").Find(&confirmedGrns).Error; err != nil {
				return fmt.Errorf("failed to get confirmed GRNs: %w", err)
			}

			receivedMap := make(map[uuid.UUID]float64)
			for _, g := range confirmedGrns {
				for _, item := range g.Items {
					receivedMap[item.MaterialID] += item.QtyReceived
				}
			}

			isFullyReceived := true
			for _, poItem := range po.Items {
				if poItem.MaterialID != nil {
					if receivedMap[*poItem.MaterialID] < poItem.Qty {
						isFullyReceived = false
						break
					}
				}
			}

			newStatus := "PROCESSING"
			if isFullyReceived || po.Status == models.PurchaseStatusCompleted {
				newStatus = "COMPLETED"
			}

			if err := tx.Model(&models.RTUPurchase{}).Where("id = ?", grn.PurchaseID).Update("status", newStatus).Error; err != nil {
				return fmt.Errorf("failed to update purchase order status: %w", err)
			}
		}

		return nil
	})
}

func (s *rtuGRNService) CancelGRN(ctx context.Context, grnID uuid.UUID, cancelledBy uuid.UUID, reason string) error {
	grn, err := s.grnRepo.FindByID(ctx, grnID)
	if err != nil {
		return err
	}
	if grn == nil {
		return errors.New("GRN not found")
	}
	
	changeText := "GRN dibatalkan"
	if reason != "" {
		changeText = "Dibatalkan dengan alasan: " + reason
	}

	if grn.Status == "DRAFT" {
		grn.Status = "CANCELLED"
		grn.UpdatedBy = &cancelledBy
		if reason != "" {
			if grn.Notes != nil && *grn.Notes != "" {
				formattedNotes := *grn.Notes + " | Alasan Batal: " + reason
				grn.Notes = &formattedNotes
			} else {
				formattedNotes := "Alasan Batal: " + reason
				grn.Notes = &formattedNotes
			}
		}
		err = s.grnRepo.Update(ctx, grn)
		if err == nil {
			s.logHistory(ctx, grn.ID, "CANCEL_GRN", changeText, cancelledBy)
		}
		return err
	}

	if grn.Status != "CONFIRMED" {
		return fmt.Errorf("cannot cancel GRN with status: %s", grn.Status)
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		// Verify and reverse stock for each item
		for _, item := range grn.Items {
			var lot models.RTUStockLot
			if err := tx.Where("ref_id = ? AND ref_type = ? AND material_id = ?", grn.ID, "GRN", item.MaterialID).First(&lot).Error; err != nil {
				return fmt.Errorf("lot not found for material ID: %s", item.MaterialID)
			}

				// Strict condition: QtyRemaining must equal QtyInitial
			if lot.QtyRemaining < lot.QtyInitial {
				return errors.New("Stok dari dokumen ini sudah dipakai untuk operasional/produksi. Pembatalan diblokir untuk menjaga integritas data.")
			}

			var material models.RTUMaterial
			if err := tx.Where("id = ? AND is_deleted = false", item.MaterialID).First(&material).Error; err != nil {
				return fmt.Errorf("failed to fetch material: %w", err)
			}

			var outletStock models.RTUOutletMaterialStock
			if err := tx.Where("material_id = ? AND outlet_id = ?", item.MaterialID, grn.OutletID).First(&outletStock).Error; err != nil {
				return err
			}

			newStock := outletStock.CurrentStock - lot.QtyInitial
			outletStock.CurrentStock = newStock
			if err := tx.Save(&outletStock).Error; err != nil {
				return err
			}

			reversalNotes := "REVERSAL: " + grn.GRNNumber
			ledgerEntry := models.RTUStockLedger{
				MaterialID:   &item.MaterialID,
				OutletID:     grn.OutletID,
				MovementType: "OUT",
				Qty:          lot.QtyInitial,
				Unit:         material.Unit, // Always record in Base Unit
				RefType:      "GRN_REVERSAL",
				RefID:        &grn.ID,
				BalanceAfter: newStock,
				PriceAtTime:  lot.UnitPrice, // Price per base unit
				Notes:        &reversalNotes,
				CreatedBy:    &cancelledBy,
				CreatedAt:    time.Now(),
			}
			if err := tx.Create(&ledgerEntry).Error; err != nil {
				return err
			}

			if err := tx.Unscoped().Delete(&lot).Error; err != nil {
				return err
			}

			sourceDesc := "GRN Confirm " + grn.GRNNumber
			tx.Unscoped().Where("source = ? AND material_id = ?", sourceDesc, item.MaterialID).Delete(&models.RTUMaterialPriceHistory{})
		}

		if grn.PurchaseID != nil {
			if err := tx.Model(&models.RTUPurchase{}).Where("id = ?", grn.PurchaseID).Update("status", "PROCESSING").Error; err != nil {
				return err
			}
		}

		updates := map[string]interface{}{
			"status":     "CANCELLED",
			"updated_by": cancelledBy,
		}
		if reason != "" {
			if grn.Notes != nil && *grn.Notes != "" {
				updates["notes"] = *grn.Notes + " | Alasan Batal: " + reason
			} else {
				updates["notes"] = "Alasan Batal: " + reason
			}
		}
		if err := tx.Model(grn).Updates(updates).Error; err != nil {
			return err
		}
		grn.Status = "CANCELLED"

		history := models.RTUGRNHistory{
			GRNID:       grn.ID,
			Action:      "CANCEL_GRN",
			Changes:     changeText,
			PerformedBy: &cancelledBy,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		return nil
	})
}
