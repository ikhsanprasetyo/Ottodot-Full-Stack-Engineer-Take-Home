package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUPaymentRepository interface {
	Create(ctx context.Context, payment *models.RTUPayment) error
	FindAll(ctx context.Context, buyerID, vendorID, sellerID *uuid.UUID, status string) ([]models.RTUPayment, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUPayment, error)
	Update(ctx context.Context, payment *models.RTUPayment) error
	WithTransaction(tx *gorm.DB) RTUPaymentRepository
}

type rtuPaymentRepository struct {
	db *gorm.DB
}

func NewRTUPaymentRepository(db *gorm.DB) RTUPaymentRepository {
	return &rtuPaymentRepository{db: db}
}

func (r *rtuPaymentRepository) WithTransaction(tx *gorm.DB) RTUPaymentRepository {
	return &rtuPaymentRepository{db: tx}
}

func (r *rtuPaymentRepository) Create(ctx context.Context, payment *models.RTUPayment) error {
	return r.db.WithContext(ctx).Create(payment).Error
}

func (r *rtuPaymentRepository) FindAll(ctx context.Context, buyerID, vendorID, sellerID *uuid.UUID, status string) ([]models.RTUPayment, error) {
	query := r.db.WithContext(ctx).Model(&models.RTUPayment{}).
		Preload("Buyer").
		Preload("Seller").
		Preload("Vendor").
		Preload("Details").
		Preload("Details.Purchase").
		Preload("Details.Purchase.Items").
		Preload("Details.Purchase.Items.Material").
		Preload("Details.Purchase.Items.Product").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Preload("Histories.Performer.Position")

	if buyerID != nil {
		query = query.Where("buyer_id = ?", *buyerID)
	}
	if vendorID != nil {
		query = query.Where("vendor_id = ?", *vendorID)
	}
	if sellerID != nil {
		query = query.Where("seller_id = ?", *sellerID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var payments []models.RTUPayment
	if err := query.Order("payment_date desc, created_at desc").Find(&payments).Error; err != nil {
		return nil, err
	}
	return payments, nil
}

func (r *rtuPaymentRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUPayment, error) {
	var payment models.RTUPayment
	if err := r.db.WithContext(ctx).
		Preload("Buyer").
		Preload("Seller").
		Preload("Vendor").
		Preload("Details").
		Preload("Details.Purchase").
		Preload("Details.Purchase.Items").
		Preload("Details.Purchase.Items.Material").
		Preload("Details.Purchase.Items.Product").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Preload("Histories.Performer.Position").
		First(&payment, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *rtuPaymentRepository) Update(ctx context.Context, payment *models.RTUPayment) error {
	return r.db.WithContext(ctx).Save(payment).Error
}
