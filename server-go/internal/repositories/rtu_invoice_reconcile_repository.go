package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUInvoiceReconcileRepository interface {
	Create(ctx context.Context, invoice *models.RTUInvoiceReconcile) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUInvoiceReconcile, error)
	FindAll(ctx context.Context, purchaseID *uuid.UUID, status string) ([]*models.RTUInvoiceReconcile, error)
	Update(ctx context.Context, invoice *models.RTUInvoiceReconcile) error
	WithTransaction(tx *gorm.DB) RTUInvoiceReconcileRepository
}

type rtuInvoiceReconcileRepository struct {
	db *gorm.DB
}

func NewRTUInvoiceReconcileRepository(db *gorm.DB) RTUInvoiceReconcileRepository {
	return &rtuInvoiceReconcileRepository{db: db}
}

func (r *rtuInvoiceReconcileRepository) WithTransaction(tx *gorm.DB) RTUInvoiceReconcileRepository {
	return &rtuInvoiceReconcileRepository{db: tx}
}

func (r *rtuInvoiceReconcileRepository) Create(ctx context.Context, invoice *models.RTUInvoiceReconcile) error {
	return r.db.WithContext(ctx).Create(invoice).Error
}

func (r *rtuInvoiceReconcileRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUInvoiceReconcile, error) {
	var invoice models.RTUInvoiceReconcile
	err := r.db.WithContext(ctx).
		Preload("Purchase").
		Preload("Vendor").
		Preload("Outlet").
		Preload("Items").
		Preload("Items.Material").
		Preload("GRNs").
		Preload("GRNs.Items").
		Preload("GRNs.Items.Material").
		Preload("Creator").
		Preload("Updater").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Preload("Performer")
		}).
		Where("id = ? AND is_deleted = false", id).
		First(&invoice).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &invoice, nil
}

func (r *rtuInvoiceReconcileRepository) FindAll(ctx context.Context, purchaseID *uuid.UUID, status string) ([]*models.RTUInvoiceReconcile, error) {
	var invoices []*models.RTUInvoiceReconcile
	query := r.db.WithContext(ctx).
		Preload("Purchase").
		Preload("Purchase.Seller").
		Preload("Purchase.Vendor").
		Preload("Vendor").
		Preload("Outlet").
		Preload("Items").
		Preload("Items.Material").
		Preload("GRNs").
		Preload("GRNs.Items").
		Preload("GRNs.Items.Material").
		Preload("Creator").
		Preload("Updater").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Preload("Performer")
		}).
		Where("is_deleted = false")

	if purchaseID != nil {
		query = query.Where("purchase_id = ?", *purchaseID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	err := query.Order("created_at desc").Find(&invoices).Error
	return invoices, err
}

func (r *rtuInvoiceReconcileRepository) Update(ctx context.Context, invoice *models.RTUInvoiceReconcile) error {
	return r.db.WithContext(ctx).Omit("Items", "GRNs", "Vendor", "Outlet", "Purchase").Save(invoice).Error
}
