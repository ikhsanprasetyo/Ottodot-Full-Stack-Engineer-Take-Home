package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUDistributionRepository interface {
	Create(ctx context.Context, dist *models.RTUDistribution) error
	Update(ctx context.Context, dist *models.RTUDistribution) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUDistribution, error)
	FindAll(ctx context.Context) ([]models.RTUDistribution, error)
	FindAllByOutlet(ctx context.Context, outletID uuid.UUID) ([]models.RTUDistribution, error)
	WithTransaction(tx *gorm.DB) RTUDistributionRepository
}

type rtuDistributionRepository struct {
	db *gorm.DB
}

func NewRTUDistributionRepository(db *gorm.DB) RTUDistributionRepository {
	return &rtuDistributionRepository{db: db}
}

func (r *rtuDistributionRepository) WithTransaction(tx *gorm.DB) RTUDistributionRepository {
	return &rtuDistributionRepository{db: tx}
}

func (r *rtuDistributionRepository) Create(ctx context.Context, dist *models.RTUDistribution) error {
	return r.db.WithContext(ctx).Create(dist).Error
}

func (r *rtuDistributionRepository) Update(ctx context.Context, dist *models.RTUDistribution) error {
	return r.db.WithContext(ctx).Save(dist).Error
}

func (r *rtuDistributionRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUDistribution, error) {
	var dist models.RTUDistribution
	err := r.db.WithContext(ctx).
		Preload("Outlet").
		Preload("Vendor").
		Preload("SourceOutlet").
		Preload("Items").
		Preload("Items.Product").
		Preload("Items.Material").
		Preload("Creator").
		Preload("Updater").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		First(&dist, "id = ? AND is_deleted = false", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &dist, err
}

func (r *rtuDistributionRepository) FindAll(ctx context.Context) ([]models.RTUDistribution, error) {
	var dists []models.RTUDistribution
	err := r.db.WithContext(ctx).
		Preload("Outlet").
		Preload("Vendor").
		Preload("SourceOutlet").
		Preload("Items").
		Preload("Items.Product").
		Preload("Items.Material").
		Preload("Creator").
		Preload("Updater").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Order("created_at DESC").
		Find(&dists, "is_deleted = false").Error
	return dists, err
}

func (r *rtuDistributionRepository) FindAllByOutlet(ctx context.Context, outletID uuid.UUID) ([]models.RTUDistribution, error) {
	var dists []models.RTUDistribution
	err := r.db.WithContext(ctx).
		Preload("Outlet").
		Preload("Vendor").
		Preload("SourceOutlet").
		Preload("Items").
		Preload("Items.Product").
		Preload("Items.Material").
		Preload("Creator").
		Preload("Updater").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Where("(outlet_id = ? OR source_outlet_id = ?) AND is_deleted = false", outletID, outletID).
		Order("created_at DESC").
		Find(&dists).Error
	return dists, err
}
