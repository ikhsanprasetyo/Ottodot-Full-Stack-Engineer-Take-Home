package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUProductionBatchRepository interface {
	Create(ctx context.Context, batch *models.RTUProductionBatch) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUProductionBatch, error)
        FindAll(ctx context.Context, status string, outletID *uuid.UUID) ([]*models.RTUProductionBatch, error)
        Update(ctx context.Context, batch *models.RTUProductionBatch) error
        Delete(ctx context.Context, id uuid.UUID) error
        WithTransaction(tx *gorm.DB) RTUProductionBatchRepository
}

type rtuProductionBatchRepository struct {
	db *gorm.DB
}

func NewRTUProductionBatchRepository(db *gorm.DB) RTUProductionBatchRepository {
	return &rtuProductionBatchRepository{db: db}
}

func (r *rtuProductionBatchRepository) WithTransaction(tx *gorm.DB) RTUProductionBatchRepository {
	return &rtuProductionBatchRepository{db: tx}
}

func (r *rtuProductionBatchRepository) Create(ctx context.Context, batch *models.RTUProductionBatch) error {
	return r.db.WithContext(ctx).Create(batch).Error
}

func (r *rtuProductionBatchRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUProductionBatch, error) {
	var batch models.RTUProductionBatch
	err := r.db.WithContext(ctx).
		Preload("Product").
		Preload("Outlet").
		Preload("RecipeVersion").
		Preload("MaterialUsages").
		Preload("MaterialUsages.Material").
		Preload("LaborItems").
		Preload("OverheadItems").
		Preload("Creator").
		Preload("Creator.Position").
		Preload("Updater").
		Preload("Updater.Position").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Preload("Histories.Performer.Position").
		Where("id = ? AND is_deleted = false", id).
		First(&batch).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &batch, nil
}

func (r *rtuProductionBatchRepository) FindAll(ctx context.Context, status string, outletID *uuid.UUID) ([]*models.RTUProductionBatch, error) {
	var batches []*models.RTUProductionBatch
	query := r.db.WithContext(ctx).
		Preload("Product").
		Preload("Outlet").
		Preload("RecipeVersion").
		Preload("MaterialUsages").
		Preload("MaterialUsages.Material").
		Preload("LaborItems").
		Preload("OverheadItems").
		Preload("Creator").
		Preload("Creator.Position").
		Preload("Updater").
		Preload("Updater.Position").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Preload("Histories.Performer.Position").
		Where("is_deleted = false")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if outletID != nil {
		query = query.Where("outlet_id = ?", *outletID)
	}

	err := query.Order("created_at desc").Find(&batches).Error
	return batches, err
}

func (r *rtuProductionBatchRepository) Update(ctx context.Context, batch *models.RTUProductionBatch) error {
        return r.db.WithContext(ctx).Omit("Histories").Save(batch).Error
}

func (r *rtuProductionBatchRepository) Delete(ctx context.Context, id uuid.UUID) error {
        return r.db.WithContext(ctx).Model(&models.RTUProductionBatch{}).Where("id = ?", id).Update("is_deleted", true).Error
}
