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

type CreatePaymentReq struct {
	BuyerID     uuid.UUID                `json:"buyerId"`
	SellerID    *uuid.UUID               `json:"sellerId,omitempty"`
	VendorID    *uuid.UUID               `json:"vendorId,omitempty"`
	PaymentDate time.Time                `json:"paymentDate"`
	Method      models.PaymentMethod     `json:"method"`
	TaxPercent  float64                  `json:"taxPercent"`
	BankName    string                   `json:"bankName"`
	BankAccount string                   `json:"bankAccount"`
	Notes       string                   `json:"notes"`
	Details     []CreatePaymentDetailReq `json:"details"`
}

type CreatePaymentDetailReq struct {
	PurchaseID    uuid.UUID `json:"purchaseId"`
	AmountApplied float64   `json:"amountApplied"`
	Notes         string    `json:"notes"`
}

type RTUPaymentService interface {
	CreatePayment(ctx context.Context, req *CreatePaymentReq, createdBy uuid.UUID) (*models.RTUPayment, error)
	GetPayments(ctx context.Context, buyerID, vendorID, sellerID *uuid.UUID, status string) ([]models.RTUPayment, error)
	GetPaymentByID(ctx context.Context, id uuid.UUID) (*models.RTUPayment, error)
	CompletePayment(ctx context.Context, id uuid.UUID, updatedBy uuid.UUID) error
	CancelPayment(ctx context.Context, id uuid.UUID, updatedBy uuid.UUID, reason string) error
	GetBanks(ctx context.Context) ([]models.RTUBank, error)
}

type rtuPaymentService struct {
	db          *gorm.DB
	paymentRepo repositories.RTUPaymentRepository
}

func NewRTUPaymentService(db *gorm.DB, paymentRepo repositories.RTUPaymentRepository) RTUPaymentService {
	return &rtuPaymentService{db: db, paymentRepo: paymentRepo}
}

func (s *rtuPaymentService) CreatePayment(ctx context.Context, req *CreatePaymentReq, createdBy uuid.UUID) (*models.RTUPayment, error) {
	if len(req.Details) == 0 {
		return nil, errors.New("payment must have at least one detail")
	}

	var totalAmount float64
	var details []models.RTUPaymentDetail

	for _, d := range req.Details {
		if d.AmountApplied <= 0 {
			return nil, errors.New("amount applied must be greater than zero")
		}
		totalAmount += d.AmountApplied
		details = append(details, models.RTUPaymentDetail{
			PurchaseID:    d.PurchaseID,
			AmountApplied: d.AmountApplied,
			Notes:         d.Notes,
		})
	}
	var buyerAbbrev string
	if req.BuyerID != uuid.Nil {
		var buyerOutlet models.Outlet
		if err := s.db.WithContext(ctx).Select("abbreviation").First(&buyerOutlet, "id = ?", req.BuyerID).Error; err == nil {
			if buyerOutlet.Abbreviation != nil && *buyerOutlet.Abbreviation != "" {
				buyerAbbrev = *buyerOutlet.Abbreviation
			}
		}
	}

	prefix := "PAY-"
	if buyerAbbrev != "" {
		prefix = fmt.Sprintf("PAY-%s-", buyerAbbrev)
	}

	payDateStr := time.Now().Format("20060102")
	if !req.PaymentDate.IsZero() {
		payDateStr = req.PaymentDate.Format("20060102")
	}

	payment := &models.RTUPayment{
		DocNumber:   fmt.Sprintf("%s%s-%s", prefix, payDateStr, uuid.New().String()[:4]),
		BuyerID:     req.BuyerID,
		VendorID:    req.VendorID,
		SellerID:    req.SellerID,
		PaymentDate: req.PaymentDate,
		Amount:      totalAmount,
		TaxPercent:  req.TaxPercent,
		Method:      req.Method,
		Status:      models.PaymentStatusDraft,
		BankName:    req.BankName,
		BankAccount: req.BankAccount,
		Notes:       req.Notes,
		Details:     details,
		CreatedBy:   &createdBy,
		UpdatedBy:   &createdBy,
	}

	if err := s.paymentRepo.Create(ctx, payment); err != nil {
		return nil, err
	}

	history := models.RTUPaymentHistory{
		ID:          uuid.New(),
		PaymentID:   payment.ID,
		Action:      "CREATED",
		Changes:     fmt.Sprintf("Dokumen pembayaran %s dibuat", payment.DocNumber),
		PerformedBy: &createdBy,
		CreatedAt:   time.Now(),
	}
	s.db.WithContext(ctx).Create(&history)

	return payment, nil
}

func (s *rtuPaymentService) GetPayments(ctx context.Context, buyerID, vendorID, sellerID *uuid.UUID, status string) ([]models.RTUPayment, error) {
	return s.paymentRepo.FindAll(ctx, buyerID, vendorID, sellerID, status)
}

func (s *rtuPaymentService) GetPaymentByID(ctx context.Context, id uuid.UUID) (*models.RTUPayment, error) {
	return s.paymentRepo.FindByID(ctx, id)
}

func (s *rtuPaymentService) CompletePayment(ctx context.Context, id uuid.UUID, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var payment models.RTUPayment
		if err := tx.Preload("Details").Where("id = ? AND is_deleted = false", id).First(&payment).Error; err != nil {
			return err
		}

		if payment.Status != models.PaymentStatusDraft {
			return errors.New("only DRAFT payment can be completed")
		}

		oldPayment := payment
		payment.Status = models.PaymentStatusCompleted
		payment.UpdatedBy = &updatedBy

		if err := tx.Omit("Details").Save(&payment).Error; err != nil {
			return err
		}

		history := models.RTUPaymentHistory{
			ID:          uuid.New(),
			PaymentID:   payment.ID,
			Action:      "COMPLETED",
			Changes:     repositories.ComparePaymentChanges(&oldPayment, &payment),
			PerformedBy: &updatedBy,
			CreatedAt:   time.Now(),
		}
		tx.Create(&history)

		// Update each PO's status if it is fully paid
		for _, det := range payment.Details {
			var po models.RTUPurchase
			if err := tx.Preload("Items").Where("id = ? AND is_deleted = false", det.PurchaseID).First(&po).Error; err != nil {
				continue // Skip if PO not found or deleted
			}

			// Calculate paid amount from COMPLETED payments
			var totalPaid float64
			err := tx.Table("rtu_payment_details").
				Joins("join rtu_payments on rtu_payments.id = rtu_payment_details.payment_id").
				Where("rtu_payment_details.purchase_id = ? AND rtu_payments.status = ? AND rtu_payments.is_deleted = false", po.ID, models.PaymentStatusCompleted).
				Select("COALESCE(SUM(rtu_payment_details.amount_applied), 0)").
				Row().Scan(&totalPaid)
			if err != nil {
				return fmt.Errorf("failed to calculate paid amount: %w", err)
			}

			// Calculate total tagihan (confirmed invoices total, or fallback to PO total)
			var totalTagihan float64
			var hasInvoice bool
			var invoiceCount int64
			if err := tx.Model(&models.RTUInvoiceReconcile{}).
				Where("purchase_id = ? AND status = ? AND is_deleted = false", po.ID, "CONFIRMED").
				Count(&invoiceCount).Error; err == nil && invoiceCount > 0 {
				hasInvoice = true
				if err := tx.Model(&models.RTUInvoiceReconcile{}).
					Where("purchase_id = ? AND status = ? AND is_deleted = false", po.ID, "CONFIRMED").
					Select("COALESCE(SUM(total_amount), 0)").
					Row().Scan(&totalTagihan); err != nil {
					return fmt.Errorf("failed to calculate invoice total: %w", err)
				}
			}

			if !hasInvoice {
				// Calculate PO total
				var subtotal float64
				for _, item := range po.Items {
					subtotal += float64(item.Qty) * item.UnitPrice * (1.0 - item.Discount/100.0)
				}
				totalTagihan = subtotal
				if po.TaxPercent > 0 {
					totalTagihan += (subtotal * po.TaxPercent) / 100.0
				}
			}

			if totalPaid >= totalTagihan && totalTagihan > 0 {
				if err := tx.Model(&models.RTUPurchase{}).
					Where("id = ?", po.ID).
					Update("status", "COMPLETED").Error; err != nil {
					return fmt.Errorf("failed to update purchase order status to COMPLETED: %w", err)
				}
			}
		}

		return nil
	})
}

func (s *rtuPaymentService) CancelPayment(ctx context.Context, id uuid.UUID, updatedBy uuid.UUID, reason string) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var payment models.RTUPayment
		if err := tx.Preload("Details").Where("id = ? AND is_deleted = false", id).First(&payment).Error; err != nil {
			return err
		}

		if payment.Status == models.PaymentStatusCancelled {
			return errors.New("payment is already cancelled")
		}

		oldPayment := payment
		oldStatus := payment.Status
		payment.Status = models.PaymentStatusCancelled
		payment.UpdatedBy = &updatedBy

		if reason != "" {
			if payment.Notes != "" {
				payment.Notes = fmt.Sprintf("%s (Dibatalkan: %s)", payment.Notes, reason)
			} else {
				payment.Notes = fmt.Sprintf("Dibatalkan: %s", reason)
			}
		}

		if err := tx.Omit("Details").Save(&payment).Error; err != nil {
			return err
		}

		changeText := repositories.ComparePaymentChanges(&oldPayment, &payment)
		if reason != "" {
			changeText = fmt.Sprintf("%s. Alasan pembatalan: %s", changeText, reason)
		}

		history := models.RTUPaymentHistory{
			ID:          uuid.New(),
			PaymentID:   payment.ID,
			Action:      "CANCELLED",
			Changes:     changeText,
			PerformedBy: &updatedBy,
			CreatedAt:   time.Now(),
		}
		tx.Create(&history)

		// Only adjust PO statuses if the cancelled payment was already COMPLETED
		if oldStatus == models.PaymentStatusCompleted {
			for _, det := range payment.Details {
				var po models.RTUPurchase
				if err := tx.Preload("Items").Where("id = ? AND is_deleted = false", det.PurchaseID).First(&po).Error; err != nil {
					continue
				}

				// Calculate paid amount from COMPLETED payments (excluding this cancelled one)
				var totalPaid float64
				err := tx.Table("rtu_payment_details").
					Joins("join rtu_payments on rtu_payments.id = rtu_payment_details.payment_id").
					Where("rtu_payment_details.purchase_id = ? AND rtu_payments.status = ? AND rtu_payments.is_deleted = false", po.ID, models.PaymentStatusCompleted).
					Select("COALESCE(SUM(rtu_payment_details.amount_applied), 0)").
					Row().Scan(&totalPaid)
				if err != nil {
					return fmt.Errorf("failed to calculate paid amount: %w", err)
				}

				// Calculate total tagihan
				var totalTagihan float64
				var hasInvoice bool
				var invoiceCount int64
				if err := tx.Model(&models.RTUInvoiceReconcile{}).
					Where("purchase_id = ? AND status = ? AND is_deleted = false", po.ID, "CONFIRMED").
					Count(&invoiceCount).Error; err == nil && invoiceCount > 0 {
					hasInvoice = true
					if err := tx.Model(&models.RTUInvoiceReconcile{}).
						Where("purchase_id = ? AND status = ? AND is_deleted = false", po.ID, "CONFIRMED").
						Select("COALESCE(SUM(total_amount), 0)").
						Row().Scan(&totalTagihan); err != nil {
						return fmt.Errorf("failed to calculate invoice total: %w", err)
					}
				}

				if !hasInvoice {
					var subtotal float64
					for _, item := range po.Items {
						subtotal += float64(item.Qty) * item.UnitPrice * (1.0 - item.Discount/100.0)
					}
					totalTagihan = subtotal
					if po.TaxPercent > 0 {
						totalTagihan += (subtotal * po.TaxPercent) / 100.0
					}
				}

				if po.Status == models.PurchaseStatusCompleted && totalPaid < totalTagihan {
					if err := tx.Model(&models.RTUPurchase{}).
						Where("id = ?", po.ID).
						Update("status", models.PurchaseStatusProcessing).Error; err != nil {
						return fmt.Errorf("failed to update purchase order status to PROCESSING: %w", err)
					}
				}
			}
		}

		return nil
	})
}

func (s *rtuPaymentService) GetBanks(ctx context.Context) ([]models.RTUBank, error) {
	var banks []models.RTUBank
	err := s.db.WithContext(ctx).Where("is_deleted = ?", false).Order("label ASC").Find(&banks).Error
	return banks, err
}
