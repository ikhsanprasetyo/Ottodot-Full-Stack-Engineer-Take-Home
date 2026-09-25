package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUCategoryRepository interface {
	Create(ctx context.Context, category *models.RTUCategory) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUCategory, error)
	FindByIDUnscoped(ctx context.Context, id uuid.UUID) (*models.RTUCategory, error)
	FindAll(ctx context.Context, search string, isActive *bool, showDeleted bool) ([]models.RTUCategory, error)
	Update(ctx context.Context, category *models.RTUCategory) error
	Delete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error
	Restore(ctx context.Context, id uuid.UUID) error
	HardDelete(ctx context.Context, id uuid.UUID) error
}

type rtuCategoryRepository struct {
	db *gorm.DB
}

func NewRTUCategoryRepository(db *gorm.DB) RTUCategoryRepository {
	return &rtuCategoryRepository{db}
}

func (r *rtuCategoryRepository) Create(ctx context.Context, category *models.RTUCategory) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *rtuCategoryRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUCategory, error) {
	var category models.RTUCategory
	err := r.db.WithContext(ctx).Where("id = ? AND is_deleted = ?", id, false).First(&category).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &category, nil
}

func (r *rtuCategoryRepository) FindAll(ctx context.Context, search string, isActive *bool, showDeleted bool) ([]models.RTUCategory, error) {
	var categories []models.RTUCategory
	query := r.db.WithContext(ctx).Where("is_deleted = ?", showDeleted)

	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	err := query.Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *rtuCategoryRepository) Update(ctx context.Context, category *models.RTUCategory) error {
	return r.db.WithContext(ctx).Save(category).Error
}

func (r *rtuCategoryRepository) Delete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.RTUCategory{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_deleted": true,
		"updated_by": deletedBy,
		"deleted_at": gorm.Expr("NOW()"),
	}).Error
}

func (r *rtuCategoryRepository) Restore(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.RTUCategory{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_deleted": false,
		"deleted_at": nil,
	}).Error
}

func (r *rtuCategoryRepository) FindByIDUnscoped(ctx context.Context, id uuid.UUID) (*models.RTUCategory, error) {
	var category models.RTUCategory
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&category).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &category, nil
}

func (r *rtuCategoryRepository) HardDelete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Unscoped().Where("id = ?", id).Delete(&models.RTUCategory{}).Error
}
