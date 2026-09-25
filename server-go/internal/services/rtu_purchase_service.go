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

type RTUPurchaseService interface {
	CreatePurchase(ctx context.Context, purchase *models.RTUPurchase, createdBy uuid.UUID) error
	ProcessPurchase(ctx context.Context, purchaseID uuid.UUID, updatedBy uuid.UUID) error
	ReceivePurchase(ctx context.Context, purchaseID uuid.UUID, updatedBy uuid.UUID) error
	CancelPurchase(ctx context.Context, purchaseID uuid.UUID, updatedBy uuid.UUID) error
}

type rtuPurchaseService struct {
	db           *gorm.DB
	purchaseRepo repositories.RTUPurchaseRepository
}

func NewRTUPurchaseService(db *gorm.DB, purchaseRepo repositories.RTUPurchaseRepository) RTUPurchaseService {
	return &rtuPurchaseService{
		db:           db,
		purchaseRepo: purchaseRepo,
	}
}

// CreatePurchase creates a new PO in DRAFT status from the buyer outlet.
func (s *rtuPurchaseService) CreatePurchase(ctx context.Context, purchase *models.RTUPurchase, createdBy uuid.UUID) error {
	if purchase.RequestDate.IsZero() {
		purchase.RequestDate = time.Now()
	}

	if purchase.DocNumber == "" {
		var buyerAbbrev string
		if purchase.BuyerID != uuid.Nil {
			var buyerOutlet models.Outlet
			if err := s.db.WithContext(ctx).Select("abbreviation").First(&buyerOutlet, "id = ?", purchase.BuyerID).Error; err == nil {
				if buyerOutlet.Abbreviation != nil && *buyerOutlet.Abbreviation != "" {
					buyerAbbrev = *buyerOutlet.Abbreviation
				}
			}
		}

		prefix := "PO-"
		if buyerAbbrev != "" {
			prefix = fmt.Sprintf("PO-%s-", buyerAbbrev)
		}

		purchase.DocNumber = fmt.Sprintf("%s%s-%s", prefix, purchase.RequestDate.Format("20060102"), uuid.New().String()[:4])
	}
	purchase.Status = models.PurchaseStatusDraft
	purchase.CreatedBy = &createdBy
	purchase.UpdatedBy = &createdBy
	
	err := s.purchaseRepo.Create(ctx, purchase)
	if err == nil {
		s.logHistory(ctx, purchase.ID, "CREATE_PURCHASE", "Purchase order created", createdBy)
	}
	return err
}

func (s *rtuPurchaseService) logHistory(ctx context.Context, purchaseID uuid.UUID, action, changes string, performedBy uuid.UUID) {
	history := models.RTUPurchaseHistory{
		PurchaseID:  purchaseID,
		Action:      action,
		Changes:     changes,
		PerformedBy: &performedBy,
	}
	s.db.WithContext(ctx).Create(&history)
}

// ProcessPurchase is called after a PO is confirmed.
// - OUTLET purchase: validates & deducts the seller outlet's stock (FIFO), then sets status → PROCESSING.
// - VENDOR purchase: no seller outlet stock to deduct, just sets status → PROCESSING.
func (s *rtuPurchaseService) ProcessPurchase(ctx context.Context, purchaseID uuid.UUID, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		purchaseRepoTx := s.purchaseRepo.WithTransaction(tx)

		purchase, err := purchaseRepoTx.FindByID(ctx, purchaseID)
		if err != nil {
			return err
		}
		if purchase == nil {
			return errors.New("purchase order not found")
		}
		if purchase.Status != models.PurchaseStatusDraft {
			return fmt.Errorf("cannot process PO with status: %s", purchase.Status)
		}

		now := time.Now()

		// Only deduct seller outlet stock for inter-outlet purchases.
		// Vendor purchases have no outlet stock to deduct.
		if purchase.SellerID != nil {
			for i := range purchase.Items {
				item := &purchase.Items[i]

				if purchase.Type == models.PurchaseTypeProduct {
					if item.ProductID == nil {
						return fmt.Errorf("item %d is missing productId", i+1)
					}
					var sellerStock models.RTUOutletProductStock
					if err := tx.Where("product_id = ? AND outlet_id = ?", *item.ProductID, purchase.SellerID).
						First(&sellerStock).Error; err != nil {
						return fmt.Errorf("seller has no stock record for product: %w", err)
					}
					if sellerStock.CurrentStock < item.Qty {
						return fmt.Errorf("insufficient product stock at seller. Available: %.3f, Requested: %.3f",
							sellerStock.CurrentStock, item.Qty)
					}
					sellerStock.CurrentStock -= item.Qty
					if err := tx.Save(&sellerStock).Error; err != nil {
						return fmt.Errorf("failed to deduct seller product stock: %w", err)
					}
					totalCost, err := ConsumeFIFO(tx, *purchase.SellerID, *item.ProductID, true, item.Qty, "PURCHASE", purchase.ID, now)
					if err != nil {
						return fmt.Errorf("FIFO consume error for product: %w", err)
					}
					if item.Qty > 0 {
						item.UnitPrice = totalCost / item.Qty
					}
					if err := tx.Save(item).Error; err != nil {
						return fmt.Errorf("failed to save purchase item unit price: %w", err)
					}

				} else if purchase.Type == models.PurchaseTypeMaterial {
					if item.MaterialID == nil {
						return fmt.Errorf("item %d is missing materialId", i+1)
					}
					var sellerStock models.RTUOutletMaterialStock
					if err := tx.Where("material_id = ? AND outlet_id = ?", *item.MaterialID, purchase.SellerID).
						First(&sellerStock).Error; err != nil {
						return fmt.Errorf("seller has no stock record for material: %w", err)
					}
					if sellerStock.CurrentStock < item.Qty {
						return fmt.Errorf("insufficient material stock at seller. Available: %.3f, Requested: %.3f",
							sellerStock.CurrentStock, item.Qty)
					}
					sellerStock.CurrentStock -= item.Qty
					if err := tx.Save(&sellerStock).Error; err != nil {
						return fmt.Errorf("failed to deduct seller material stock: %w", err)
					}
					totalCost, err := ConsumeFIFO(tx, *purchase.SellerID, *item.MaterialID, false, item.Qty, "PURCHASE", purchase.ID, now)
					if err != nil {
						return fmt.Errorf("FIFO consume error for material: %w", err)
					}
					if item.Qty > 0 {
						item.UnitPrice = totalCost / item.Qty
					}
					if err := tx.Save(item).Error; err != nil {
						return fmt.Errorf("failed to save purchase item unit price: %w", err)
					}
				}
			}
		}
		// For vendor purchases (VendorID != nil), no stock deduction here.
		// Stock & FIFO lot will be created at ReceivePurchase when goods physically arrive.

		oldPurchase := *purchase
		purchase.Status = models.PurchaseStatusProcessing
		purchase.ProcessDate = &now
		purchase.UpdatedBy = &updatedBy
		
		if err := purchaseRepoTx.Update(ctx, purchase); err != nil {
			return err
		}

		history := models.RTUPurchaseHistory{
			PurchaseID:  purchase.ID,
			Action:      "PROCESS_PURCHASE",
			Changes:     repositories.ComparePurchaseChanges(&oldPurchase, purchase),
			PerformedBy: &updatedBy,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		return nil
	})
}

// ReceivePurchase is called by the BUYER outlet to confirm receipt.
// It adds stock to the buyer's per-outlet stock and creates FIFO lots with the seller's cost.
func (s *rtuPurchaseService) ReceivePurchase(ctx context.Context, purchaseID uuid.UUID, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		purchaseRepoTx := s.purchaseRepo.WithTransaction(tx)

		purchase, err := purchaseRepoTx.FindByID(ctx, purchaseID)
		if err != nil {
			return err
		}
		if purchase == nil {
			return errors.New("purchase order not found")
		}
		if purchase.Status != models.PurchaseStatusProcessing {
			return fmt.Errorf("cannot receive PO with status: %s", purchase.Status)
		}

		now := time.Now()

		for _, item := range purchase.Items {
			if purchase.Type == models.PurchaseTypeProduct {
				if item.ProductID == nil {
					continue
				}
				// Upsert buyer outlet product stock
				var buyerStock models.RTUOutletProductStock
				if err := tx.Where("product_id = ? AND outlet_id = ?", *item.ProductID, purchase.BuyerID).
					First(&buyerStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						buyerStock = models.RTUOutletProductStock{
							ProductID:    *item.ProductID,
							OutletID:     purchase.BuyerID,
							CurrentStock: 0,
						}
						if err := tx.Create(&buyerStock).Error; err != nil {
							return fmt.Errorf("failed to create buyer product stock: %w", err)
						}
					} else {
						return fmt.Errorf("failed to get buyer product stock: %w", err)
					}
				}
				buyerStock.CurrentStock += item.Qty
				if err := tx.Save(&buyerStock).Error; err != nil {
					return fmt.Errorf("failed to update buyer product stock: %w", err)
				}

				// Create FIFO lot at buyer outlet
				lotNumber := fmt.Sprintf("LOT-PO-%s-%s", now.Format("20060102"), purchase.DocNumber)
				newLot := models.RTUStockLot{
					ID:           uuid.New(),
					ProductID:    item.ProductID,
					OutletID:     purchase.BuyerID,
					LotNumber:    lotNumber,
					QtyInitial:   item.Qty,
					QtyRemaining: item.Qty,
					UnitPrice:    item.UnitPrice,
					RefType:      "PURCHASE",
					RefID:        purchase.ID,
					ReceivedDate: now,
				}
				if err := ReconcileNewLot(tx, &newLot); err != nil {
					return fmt.Errorf("failed to reconcile lot for product: %w", err)
				}
				if err := tx.Create(&newLot).Error; err != nil {
					return fmt.Errorf("failed to create product stock lot at buyer: %w", err)
				}

			} else if purchase.Type == models.PurchaseTypeMaterial {
				if item.MaterialID == nil {
					continue
				}
				// Upsert buyer outlet material stock
				var buyerStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", *item.MaterialID, purchase.BuyerID).
					First(&buyerStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						buyerStock = models.RTUOutletMaterialStock{
							MaterialID:   *item.MaterialID,
							OutletID:     purchase.BuyerID,
							CurrentStock: 0,
						}
						if err := tx.Create(&buyerStock).Error; err != nil {
							return fmt.Errorf("failed to create buyer material stock: %w", err)
						}
					} else {
						return fmt.Errorf("failed to get buyer material stock: %w", err)
					}
				}
				buyerStock.CurrentStock += item.Qty
				if err := tx.Save(&buyerStock).Error; err != nil {
					return fmt.Errorf("failed to update buyer material stock: %w", err)
				}

				// Create FIFO lot at buyer outlet
				lotNumber := fmt.Sprintf("LOT-PO-%s-%s", now.Format("20060102"), purchase.DocNumber)
				newLot := models.RTUStockLot{
					ID:           uuid.New(),
					MaterialID:   item.MaterialID,
					OutletID:     purchase.BuyerID,
					LotNumber:    lotNumber,
					QtyInitial:   item.Qty,
					QtyRemaining: item.Qty,
					UnitPrice:    item.UnitPrice,
					RefType:      "PURCHASE",
					RefID:        purchase.ID,
					ReceivedDate: now,
				}
				if err := ReconcileNewLot(tx, &newLot); err != nil {
					return fmt.Errorf("failed to reconcile lot for material: %w", err)
				}
				if err := tx.Create(&newLot).Error; err != nil {
					return fmt.Errorf("failed to create material stock lot at buyer: %w", err)
				}
			}
		}

		oldPurchase := *purchase
		purchase.Status = models.PurchaseStatusCompleted
		purchase.ReceivedDate = &now
		purchase.UpdatedBy = &updatedBy
		
		if err := purchaseRepoTx.Update(ctx, purchase); err != nil {
			return err
		}

		history := models.RTUPurchaseHistory{
			PurchaseID:  purchase.ID,
			Action:      "RECEIVE_PURCHASE",
			Changes:     repositories.ComparePurchaseChanges(&oldPurchase, purchase),
			PerformedBy: &updatedBy,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		return nil
	})
}

func (s *rtuPurchaseService) CancelPurchase(ctx context.Context, purchaseID uuid.UUID, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		purchaseRepoTx := s.purchaseRepo.WithTransaction(tx)
		purchase, err := purchaseRepoTx.FindByID(ctx, purchaseID)
		if err != nil {
			return err
		}
		if purchase == nil {
			return errors.New("purchase order not found")
		}
		
		if purchase.Status == models.PurchaseStatusCancelled {
			return fmt.Errorf("purchase is already cancelled")
		}

		// 1. Check for active GRNs (Goods Receipt Notes)
		var activeGrnCount int64
		if err := tx.Model(&models.RTUGRN{}).Where("purchase_id = ? AND status != 'CANCELLED'", purchaseID).Count(&activeGrnCount).Error; err != nil {
			return err
		}
		if activeGrnCount > 0 {
			return fmt.Errorf("tidak dapat membatalkan PO karena memiliki dokumen Penerimaan (GRN) aktif yang terkait. Silakan batalkan dokumen GRN terlebih dahulu")
		}

		// 2. Check for active Invoices
		var activeInvoiceCount int64
		if err := tx.Model(&models.RTUInvoiceReconcile{}).Where("purchase_id = ? AND status != 'CANCELLED'", purchaseID).Count(&activeInvoiceCount).Error; err != nil {
			return err
		}
		if activeInvoiceCount > 0 {
			return fmt.Errorf("tidak dapat membatalkan PO karena memiliki dokumen Invoice Reconcile aktif yang terkait. Silakan batalkan dokumen Invoice terlebih dahulu")
		}

		// 3. Check for active Payments
		var activePaymentCount int64
		if err := tx.Table("rtu_payments").
			Joins("JOIN rtu_payment_details ON rtu_payments.id = rtu_payment_details.payment_id").
			Where("rtu_payment_details.purchase_id = ? AND rtu_payments.status != 'CANCELLED'", purchaseID).
			Count(&activePaymentCount).Error; err != nil {
			return err
		}
		if activePaymentCount > 0 {
			return fmt.Errorf("tidak dapat membatalkan PO karena memiliki dokumen Pembayaran aktif yang terkait. Silakan batalkan dokumen Pembayaran terlebih dahulu")
		}
		
		now := time.Now()

		// If COMPLETED, revert buyer stock
		if purchase.Status == models.PurchaseStatusCompleted {
			for _, item := range purchase.Items {
				if purchase.Type == models.PurchaseTypeProduct {
					if item.ProductID == nil {
						continue
					}
					// Consume from buyer stock
					_, err := ConsumeFIFO(tx, purchase.BuyerID, *item.ProductID, true, item.Qty, "VOID_PURCHASE_RECEIPT", purchase.ID, now)
					if err != nil {
						return fmt.Errorf("failed to revert buyer product stock (FIFO): %w", err)
					}
					var buyerStock models.RTUOutletProductStock
					if err := tx.Where("product_id = ? AND outlet_id = ?", *item.ProductID, purchase.BuyerID).First(&buyerStock).Error; err == nil {
						buyerStock.CurrentStock -= item.Qty
						tx.Save(&buyerStock)
					}
				} else if purchase.Type == models.PurchaseTypeMaterial {
					if item.MaterialID == nil {
						continue
					}
					// Consume from buyer stock
					_, err := ConsumeFIFO(tx, purchase.BuyerID, *item.MaterialID, false, item.Qty, "VOID_PURCHASE_RECEIPT", purchase.ID, now)
					if err != nil {
						return fmt.Errorf("failed to revert buyer material stock (FIFO): %w", err)
					}
					var buyerStock models.RTUOutletMaterialStock
					if err := tx.Where("material_id = ? AND outlet_id = ?", *item.MaterialID, purchase.BuyerID).First(&buyerStock).Error; err == nil {
						buyerStock.CurrentStock -= item.Qty
						tx.Save(&buyerStock)
					}
				}
			}
		}

		// If PROCESSING or COMPLETED, revert seller stock (if seller exists)
		if (purchase.Status == models.PurchaseStatusProcessing || purchase.Status == models.PurchaseStatusCompleted) && purchase.SellerID != nil {
			for idx, item := range purchase.Items {
				if purchase.Type == models.PurchaseTypeProduct {
					if item.ProductID == nil {
						continue
					}
					// Put back to seller stock
					var sellerStock models.RTUOutletProductStock
					if err := tx.Where("product_id = ? AND outlet_id = ?", *item.ProductID, *purchase.SellerID).First(&sellerStock).Error; err != nil {
						if errors.Is(err, gorm.ErrRecordNotFound) {
							sellerStock = models.RTUOutletProductStock{
								ProductID:    *item.ProductID,
								OutletID:     *purchase.SellerID,
								CurrentStock: 0,
							}
							tx.Create(&sellerStock)
						}
					}
					sellerStock.CurrentStock += item.Qty
					tx.Save(&sellerStock)

					// Create Lot for returned product
					returnLot := models.RTUStockLot{
						ID:           uuid.New(),
						ProductID:    item.ProductID,
						OutletID:     *purchase.SellerID,
						LotNumber:    fmt.Sprintf("LOT-RTN-PO-%s-%s-%s-I%d", now.Format("20060102"), purchase.DocNumber, uuid.New().String()[:6], idx+1),
						QtyInitial:   item.Qty,
						QtyRemaining: item.Qty,
						UnitPrice:    item.UnitPrice, // Use the price that was deducted
						RefType:      "VOID_PURCHASE",
						RefID:        purchase.ID,
						ReceivedDate: now,
					}
					if err := ReconcileNewLot(tx, &returnLot); err != nil {
						return err
					}
					tx.Create(&returnLot)

				} else if purchase.Type == models.PurchaseTypeMaterial {
					if item.MaterialID == nil {
						continue
					}
					// Put back to seller stock
					var sellerStock models.RTUOutletMaterialStock
					if err := tx.Where("material_id = ? AND outlet_id = ?", *item.MaterialID, *purchase.SellerID).First(&sellerStock).Error; err != nil {
						if errors.Is(err, gorm.ErrRecordNotFound) {
							sellerStock = models.RTUOutletMaterialStock{
								MaterialID:   *item.MaterialID,
								OutletID:     *purchase.SellerID,
								CurrentStock: 0,
							}
							tx.Create(&sellerStock)
						}
					}
					sellerStock.CurrentStock += item.Qty
					tx.Save(&sellerStock)

					// Create Lot for returned material
					returnLot := models.RTUStockLot{
						ID:           uuid.New(),
						MaterialID:   item.MaterialID,
						OutletID:     *purchase.SellerID,
						LotNumber:    fmt.Sprintf("LOT-RTN-PO-%s-%s-%s-I%d", now.Format("20060102"), purchase.DocNumber, uuid.New().String()[:6], idx+1),
						QtyInitial:   item.Qty,
						QtyRemaining: item.Qty,
						UnitPrice:    item.UnitPrice, // Use the price that was deducted
						RefType:      "VOID_PURCHASE",
						RefID:        purchase.ID,
						ReceivedDate: now,
					}
					if err := ReconcileNewLot(tx, &returnLot); err != nil {
						return err
					}
					tx.Create(&returnLot)
				}
			}
		}

		oldPurchase := *purchase
		purchase.Status = models.PurchaseStatusCancelled
		purchase.UpdatedBy = &updatedBy
		
		if err := purchaseRepoTx.Update(ctx, purchase); err != nil {
			return err
		}

		history := models.RTUPurchaseHistory{
			PurchaseID:  purchase.ID,
			Action:      "CANCEL_PURCHASE",
			Changes:     repositories.ComparePurchaseChanges(&oldPurchase, purchase),
			PerformedBy: &updatedBy,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		return nil
	})
}
