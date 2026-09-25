package repositories

import (
	"context"

	"strings"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUGRNRepository interface {
	Create(ctx context.Context, grn *models.RTUGRN) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUGRN, error)
	FindAll(ctx context.Context, status string) ([]*models.RTUGRN, error)
	Update(ctx context.Context, grn *models.RTUGRN) error
	WithTransaction(tx *gorm.DB) RTUGRNRepository
}

type rtuGRNRepository struct {
	db *gorm.DB
}

func NewRTUGRNRepository(db *gorm.DB) RTUGRNRepository {
	return &rtuGRNRepository{db: db}
}

func (r *rtuGRNRepository) WithTransaction(tx *gorm.DB) RTUGRNRepository {
	return &rtuGRNRepository{db: tx}
}

func (r *rtuGRNRepository) Create(ctx context.Context, grn *models.RTUGRN) error {
	return r.db.WithContext(ctx).Create(grn).Error
}

func (r *rtuGRNRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUGRN, error) {
	var grn models.RTUGRN
	err := r.db.WithContext(ctx).
		Preload("Vendor").
		Preload("Outlet").
		Preload("Purchase").
		Preload("Purchase.Seller").
		Preload("Purchase.Vendor").
		Preload("Items").
		Preload("Items.Material").
		Preload("Creator").
		Preload("Updater").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Preload("Performer")
		}).
		Where("id = ? AND is_deleted = false", id).
		First(&grn).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &grn, nil
}

func (r *rtuGRNRepository) FindAll(ctx context.Context, status string) ([]*models.RTUGRN, error) {
	var grns []*models.RTUGRN
	query := r.db.WithContext(ctx).
		Preload("Vendor").
		Preload("Outlet").
		Preload("Purchase").
		Preload("Purchase.Seller").
		Preload("Purchase.Vendor").
		Preload("Items").
		Preload("Items.Material").
		Preload("Creator").
		Preload("Updater").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Preload("Performer")
		}).
		Where("is_deleted = false")

	if status != "" {
		statuses := strings.Split(status, ",")
		if len(statuses) > 1 {
			query = query.Where("status IN ?", statuses)
		} else {
			query = query.Where("status = ?", status)
		}
	}

	err := query.Order("created_at desc").Find(&grns).Error
	return grns, err
}

func (r *rtuGRNRepository) Update(ctx context.Context, grn *models.RTUGRN) error {
	return r.db.WithContext(ctx).Omit("Items", "Vendor", "Outlet").Save(grn).Error
}
