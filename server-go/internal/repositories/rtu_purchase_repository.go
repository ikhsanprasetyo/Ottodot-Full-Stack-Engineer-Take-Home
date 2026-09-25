package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUPurchaseRepository interface {
	Create(ctx context.Context, purchase *models.RTUPurchase) error
	FindAll(ctx context.Context, buyerID, sellerID, vendorID *uuid.UUID, status, purchaseType string) ([]models.RTUPurchase, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUPurchase, error)
	Update(ctx context.Context, purchase *models.RTUPurchase) error
	WithTransaction(tx *gorm.DB) RTUPurchaseRepository
}

type rtuPurchaseRepository struct {
	db *gorm.DB
}

func NewRTUPurchaseRepository(db *gorm.DB) RTUPurchaseRepository {
	return &rtuPurchaseRepository{db: db}
}

func (r *rtuPurchaseRepository) WithTransaction(tx *gorm.DB) RTUPurchaseRepository {
	return &rtuPurchaseRepository{db: tx}
}

func (r *rtuPurchaseRepository) Create(ctx context.Context, purchase *models.RTUPurchase) error {
	return r.db.WithContext(ctx).Create(purchase).Error
}

func (r *rtuPurchaseRepository) FindAll(ctx context.Context, buyerID, sellerID, vendorID *uuid.UUID, status, purchaseType string) ([]models.RTUPurchase, error) {
	var purchases []models.RTUPurchase
	query := r.db.WithContext(ctx).
		Where("is_deleted = false").
		Preload("Buyer").
		Preload("Seller").
		Preload("Vendor").
		Preload("Items").
		Preload("Items.Product").
		Preload("Items.Material").
		Preload("Creator").
		Preload("Updater")

	if buyerID != nil {
		query = query.Where("buyer_id = ?", *buyerID)
	}
	if sellerID != nil {
		query = query.Where("seller_id = ?", *sellerID)
	}
	if vendorID != nil {
		query = query.Where("vendor_id = ?", *vendorID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if purchaseType != "" {
		query = query.Where("type = ?", purchaseType)
	}

	query = query.Preload("Histories", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC").Preload("Performer")
	})

	if err := query.Order("created_at DESC").Find(&purchases).Error; err != nil {
		return nil, err
	}
	return purchases, nil
}

func (r *rtuPurchaseRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUPurchase, error) {
	var purchase models.RTUPurchase
	err := r.db.WithContext(ctx).
		Where("id = ? AND is_deleted = false", id).
		Preload("Buyer").
		Preload("Seller").
		Preload("Vendor").
		Preload("Items").
		Preload("Items.Product").
		Preload("Items.Material").
		Preload("Creator").
		Preload("Updater").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Preload("Performer")
		}).
		First(&purchase).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &purchase, nil
}

func (r *rtuPurchaseRepository) Update(ctx context.Context, purchase *models.RTUPurchase) error {
	return r.db.WithContext(ctx).Save(purchase).Error
}
