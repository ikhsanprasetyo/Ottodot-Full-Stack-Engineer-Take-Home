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

// CreateInvoiceReq is the payload for creating a new Invoice Reconcile.
type CreateInvoiceReq struct {
	PurchaseID   *uuid.UUID             `json:"purchaseId,omitempty"`
	VendorID     *uuid.UUID             `json:"vendorId,omitempty"`
	OutletID     uuid.UUID              `json:"outletId"`
	InvoiceDate  time.Time              `json:"invoiceDate"`
	TaxPercent   float64                `json:"taxPercent"`
	ShippingFee  float64                `json:"shippingFee"`
	LoadingFee   float64                `json:"loadingFee"`
	UnloadingFee float64                `json:"unloadingFee"`
	AdditionalCosts []models.AdditionalCost `json:"additionalCosts"`
	Notes           string                  `json:"notes"`
	Items           []CreateInvoiceItemReq  `json:"items"`
	GRNIDs       []uuid.UUID            `json:"grnIds"` // GRNs being reconciled
}

type CreateInvoiceItemReq struct {
	MaterialID  uuid.UUID `json:"materialId"`
	QtyInvoiced float64   `json:"qtyInvoiced"`
	Unit        string    `json:"unit"`
	UnitPrice   float64   `json:"unitPrice"`
	Discount    float64   `json:"discount"`
}

// UpdateInvoiceReq is the payload for updating a DRAFT Invoice Reconcile.
type UpdateInvoiceReq struct {
	InvoiceDate  time.Time              `json:"invoiceDate"`
	TaxPercent   float64                `json:"taxPercent"`
	ShippingFee  float64                `json:"shippingFee"`
	LoadingFee   float64                `json:"loadingFee"`
	UnloadingFee float64                `json:"unloadingFee"`
	AdditionalCosts []models.AdditionalCost `json:"additionalCosts"`
	Notes           string                  `json:"notes"`
	Items           []CreateInvoiceItemReq  `json:"items"`
	GRNIDs       []uuid.UUID            `json:"grnIds"`
}

type RTUInvoiceReconcileService interface {
	CreateInvoice(ctx context.Context, req *CreateInvoiceReq, createdBy uuid.UUID) (*models.RTUInvoiceReconcile, error)
	UpdateInvoice(ctx context.Context, invoiceID uuid.UUID, req *UpdateInvoiceReq, updatedBy uuid.UUID) error
	ConfirmInvoice(ctx context.Context, invoiceID uuid.UUID, confirmedBy uuid.UUID) error
	CancelInvoice(ctx context.Context, invoiceID uuid.UUID, cancelledBy uuid.UUID, reason string) error
	GetAll(ctx context.Context, purchaseID *uuid.UUID, status string) ([]*models.RTUInvoiceReconcile, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.RTUInvoiceReconcile, error)
}

type rtuInvoiceReconcileService struct {
	db          *gorm.DB
	invoiceRepo repositories.RTUInvoiceReconcileRepository
}

func NewRTUInvoiceReconcileService(db *gorm.DB, invoiceRepo repositories.RTUInvoiceReconcileRepository) RTUInvoiceReconcileService {
	return &rtuInvoiceReconcileService{db: db, invoiceRepo: invoiceRepo}
}

func (s *rtuInvoiceReconcileService) CreateInvoice(ctx context.Context, req *CreateInvoiceReq, createdBy uuid.UUID) (*models.RTUInvoiceReconcile, error) {
	if len(req.Items) == 0 {
		return nil, errors.New("invoice must have at least one item")
	}

	if req.PurchaseID != nil {
		var count int64
		if err := s.db.WithContext(ctx).Model(&models.RTUInvoiceReconcile{}).
			Where("purchase_id = ? AND status != 'CANCELLED' AND is_deleted = false", *req.PurchaseID).
			Count(&count).Error; err != nil {
			return nil, fmt.Errorf("failed to check existing invoice for PO: %w", err)
		}
		if count > 0 {
			return nil, errors.New("Purchase Order ini sudah memiliki Invoice Reconcile aktif")
		}
	}

	var subtotal float64
	items := make([]models.RTUInvoiceReconcileItem, 0, len(req.Items))
	for _, i := range req.Items {
		if i.QtyInvoiced <= 0 {
			return nil, errors.New("qty invoiced must be greater than zero")
		}
		lineSubtotal := i.QtyInvoiced * i.UnitPrice * (1 - i.Discount/100)
		subtotal += lineSubtotal
		items = append(items, models.RTUInvoiceReconcileItem{
			MaterialID:  i.MaterialID,
			QtyInvoiced: i.QtyInvoiced,
			Unit:        i.Unit,
			UnitPrice:   i.UnitPrice,
			Discount:    i.Discount,
			Subtotal:    lineSubtotal,
		})
	}
	taxAmount := (subtotal * req.TaxPercent) / 100
	serviceFees := req.ShippingFee + req.LoadingFee + req.UnloadingFee
	var customFees float64
	for _, c := range req.AdditionalCosts {
		customFees += c.Amount
	}

	// Resolve linked GRNs
	var grns []models.RTUGRN
	for _, grnID := range req.GRNIDs {
		grns = append(grns, models.RTUGRN{ID: grnID})
	}

	invoice := &models.RTUInvoiceReconcile{
		PurchaseID:      req.PurchaseID,
		VendorID:        req.VendorID,
		OutletID:        req.OutletID,
		Status:          "DRAFT",
		InvoiceDate:     req.InvoiceDate,
		TaxPercent:      req.TaxPercent,
		ShippingFee:     req.ShippingFee,
		LoadingFee:      req.LoadingFee,
		UnloadingFee:    req.UnloadingFee,
		AdditionalCosts: req.AdditionalCosts,
		Notes:           req.Notes,
		TotalAmount:     subtotal + taxAmount + serviceFees + customFees,
		Items:           items,
		GRNs:            grns,
		CreatedBy:       &createdBy,
		UpdatedBy:       &createdBy,
	}

	if err := s.invoiceRepo.Create(ctx, invoice); err != nil {
		return nil, fmt.Errorf("failed to create invoice: %w", err)
	}

	// Log history
	s.logHistory(ctx, invoice.ID, "CREATE_INVOICE", "Invoice Reconcile created", createdBy)

	return invoice, nil
}

func (s *rtuInvoiceReconcileService) UpdateInvoice(ctx context.Context, invoiceID uuid.UUID, req *UpdateInvoiceReq, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var invoice models.RTUInvoiceReconcile
		if err := tx.Where("id = ? AND is_deleted = false", invoiceID).First(&invoice).Error; err != nil {
			return fmt.Errorf("invoice not found: %w", err)
		}
		oldInvoice := invoice
		if invoice.Status != "DRAFT" {
			return errors.New("only DRAFT invoices can be updated")
		}

		// Delete existing items
		if err := tx.Where("invoice_id = ?", invoiceID).Delete(&models.RTUInvoiceReconcileItem{}).Error; err != nil {
			return fmt.Errorf("failed to remove old items: %w", err)
		}

		// Replace GRN associations
		if err := tx.Exec("DELETE FROM rtu_invoice_reconcile_grns WHERE invoice_id = ?", invoiceID).Error; err != nil {
			return fmt.Errorf("failed to remove old GRN links: %w", err)
		}

		var subtotal float64
		items := make([]models.RTUInvoiceReconcileItem, 0, len(req.Items))
		for _, i := range req.Items {
			lineSubtotal := i.QtyInvoiced * i.UnitPrice * (1 - i.Discount/100)
			subtotal += lineSubtotal
			items = append(items, models.RTUInvoiceReconcileItem{
				InvoiceID:   invoiceID,
				MaterialID:  i.MaterialID,
				QtyInvoiced: i.QtyInvoiced,
				Unit:        i.Unit,
				UnitPrice:   i.UnitPrice,
				Discount:    i.Discount,
				Subtotal:    lineSubtotal,
			})
		}
		taxAmount := (subtotal * req.TaxPercent) / 100

		if err := tx.Create(&items).Error; err != nil {
			return fmt.Errorf("failed to save items: %w", err)
		}

		// Re-associate GRNs
		for _, grnID := range req.GRNIDs {
			if err := tx.Exec("INSERT INTO rtu_invoice_reconcile_grns (invoice_id, grn_id) VALUES (?, ?) ON CONFLICT DO NOTHING", invoiceID, grnID).Error; err != nil {
				return fmt.Errorf("failed to link GRN: %w", err)
			}
		}

		invoice.InvoiceDate = req.InvoiceDate
		invoice.TaxPercent = req.TaxPercent
		invoice.ShippingFee = req.ShippingFee
		invoice.LoadingFee = req.LoadingFee
		invoice.UnloadingFee = req.UnloadingFee
		invoice.AdditionalCosts = req.AdditionalCosts
		invoice.Notes = req.Notes

		var customFees float64
		for _, c := range req.AdditionalCosts {
			customFees += c.Amount
		}
		invoice.TotalAmount = subtotal + taxAmount + req.ShippingFee + req.LoadingFee + req.UnloadingFee + customFees
		invoice.UpdatedBy = &updatedBy

		if err := tx.Omit("Items", "GRNs", "Vendor", "Outlet", "Purchase").Save(&invoice).Error; err != nil {
			return err
		}

		s.logHistory(ctx, invoiceID, "UPDATE_INVOICE", repositories.CompareInvoiceChanges(&oldInvoice, &invoice), updatedBy)
		return nil
	})
}

func (s *rtuInvoiceReconcileService) ConfirmInvoice(ctx context.Context, invoiceID uuid.UUID, confirmedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var invoice models.RTUInvoiceReconcile
		if err := tx.Preload("Items").Where("id = ? AND is_deleted = false", invoiceID).First(&invoice).Error; err != nil {
			return fmt.Errorf("invoice not found: %w", err)
		}
		if invoice.Status != "DRAFT" {
			return fmt.Errorf("cannot confirm invoice with status: %s", invoice.Status)
		}

		oldInvoice := invoice
		invoice.Status = "CONFIRMED"
		invoice.UpdatedBy = &confirmedBy
		if err := tx.Omit("Items", "GRNs", "Vendor", "Outlet", "Purchase").Save(&invoice).Error; err != nil {
			return err
		}

		// Automatically mark the associated Purchase Order as COMPLETED when invoice is reconciled/confirmed
		if invoice.PurchaseID != nil {
			if err := tx.Model(&models.RTUPurchase{}).Where("id = ?", *invoice.PurchaseID).Update("status", "COMPLETED").Error; err != nil {
				return fmt.Errorf("failed to update purchase order status: %w", err)
			}
		}

		// Apportion service fees to linked stock lots & stock ledgers (Landed Cost / HPP)
		totalServiceFees := invoice.ShippingFee + invoice.LoadingFee + invoice.UnloadingFee
		for _, c := range invoice.AdditionalCosts {
			totalServiceFees += c.Amount
		}

		if totalServiceFees > 0 {
			var grnIDs []uuid.UUID
			if err := tx.Table("rtu_invoice_reconcile_grns").
				Where("invoice_id = ?", invoice.ID).
				Pluck("grn_id", &grnIDs).Error; err != nil {
				return fmt.Errorf("failed to get linked GRNs for apportionment: %w", err)
			}

			if len(grnIDs) > 0 {
				var totalItemsSubtotal float64
				for _, item := range invoice.Items {
					totalItemsSubtotal += item.Subtotal
				}

				if totalItemsSubtotal > 0 {
					for _, item := range invoice.Items {
						ratio := item.Subtotal / totalItemsSubtotal
						allocatedFee := ratio * totalServiceFees

						if item.QtyInvoiced > 0 {
							unitPriceAdjustment := allocatedFee / item.QtyInvoiced

							// Resolve conversion factor from linked GRN items
							var conversionFactor float64 = 1.0
							if err := tx.Table("rtu_grn_items").
								Where("grn_id IN (?) AND material_id = ?", grnIDs, item.MaterialID).
								Limit(1).
								Pluck("conversion", &conversionFactor).Error; err == nil {
								if conversionFactor <= 0 {
									conversionFactor = 1.0
								}
							}

							baseUnitPriceAdjustment := unitPriceAdjustment / conversionFactor

							// Update RTUStockLot unit_price
							if err := tx.Exec(`
								UPDATE rtu_stock_lots 
								SET unit_price = unit_price + ? 
								WHERE ref_type = 'GRN' AND ref_id IN (?) AND material_id = ?`,
								baseUnitPriceAdjustment, grnIDs, item.MaterialID).Error; err != nil {
								return fmt.Errorf("failed to update stock lot unit prices: %w", err)
							}

							// Update PriceAtTime in RTUStockLedger
							if err := tx.Exec(`
								UPDATE rtu_stock_ledgers 
								SET price_at_time = price_at_time + ? 
								WHERE ref_type = 'GRN' AND ref_id IN (?) AND material_id = ?`,
								baseUnitPriceAdjustment, grnIDs, item.MaterialID).Error; err != nil {
								return fmt.Errorf("failed to update stock ledger price_at_time: %w", err)
							}
						}
					}
				}
			}
		}

		s.logHistory(ctx, invoiceID, "CONFIRM_INVOICE", repositories.CompareInvoiceChanges(&oldInvoice, &invoice), confirmedBy)
		return nil
	})
}

func (s *rtuInvoiceReconcileService) CancelInvoice(ctx context.Context, invoiceID uuid.UUID, cancelledBy uuid.UUID, reason string) error {
	var invoice models.RTUInvoiceReconcile
	if err := s.db.WithContext(ctx).Where("id = ? AND is_deleted = false", invoiceID).First(&invoice).Error; err != nil {
		return fmt.Errorf("invoice not found: %w", err)
	}
	if invoice.Status == "CANCELLED" {
		return errors.New("invoice is already cancelled")
	}

	invoice.Status = "CANCELLED"
	invoice.UpdatedBy = &cancelledBy
	if reason != "" {
		if invoice.Notes != "" {
			invoice.Notes = invoice.Notes + " | Alasan Batal: " + reason
		} else {
			invoice.Notes = "Alasan Batal: " + reason
		}
	}
	if err := s.invoiceRepo.Update(ctx, &invoice); err != nil {
		return err
	}

	historyNotes := "CANCEL_INVOICE"
	if reason != "" {
		historyNotes = "Dibatalkan dengan alasan: " + reason
	}

	s.logHistory(ctx, invoiceID, "CANCEL_INVOICE", historyNotes, cancelledBy)
	return nil
}

func (s *rtuInvoiceReconcileService) GetAll(ctx context.Context, purchaseID *uuid.UUID, status string) ([]*models.RTUInvoiceReconcile, error) {
	return s.invoiceRepo.FindAll(ctx, purchaseID, status)
}

func (s *rtuInvoiceReconcileService) GetByID(ctx context.Context, id uuid.UUID) (*models.RTUInvoiceReconcile, error) {
	return s.invoiceRepo.FindByID(ctx, id)
}

func (s *rtuInvoiceReconcileService) logHistory(ctx context.Context, invoiceID uuid.UUID, action, changes string, performedBy uuid.UUID) {
	history := models.RTUInvoiceReconcileHistory{
		InvoiceID:   invoiceID,
		Action:      action,
		Changes:     changes,
		PerformedBy: &performedBy,
	}
	s.db.WithContext(ctx).Create(&history)
}
