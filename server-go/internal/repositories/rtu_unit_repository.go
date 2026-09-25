package repositories

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUUnitRepository interface {
	Create(ctx context.Context, unit *models.RTUUnit) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUUnit, error)
	FindByIDUnscoped(ctx context.Context, id uuid.UUID) (*models.RTUUnit, error)
	FindAll(ctx context.Context, search string, isActive *bool, showDeleted bool) ([]models.RTUUnit, error)
	Update(ctx context.Context, unit *models.RTUUnit) error
	Delete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error
	Restore(ctx context.Context, id uuid.UUID) error
	HardDelete(ctx context.Context, id uuid.UUID) error
}

type rtuUnitRepository struct {
	db *gorm.DB
}

func NewRTUUnitRepository(db *gorm.DB) RTUUnitRepository {
	return &rtuUnitRepository{db}
}

func (r *rtuUnitRepository) Create(ctx context.Context, unit *models.RTUUnit) error {
	return r.db.WithContext(ctx).Create(unit).Error
}

func (r *rtuUnitRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUUnit, error) {
	var unit models.RTUUnit
	err := r.db.WithContext(ctx).Where("id = ? AND is_deleted = ?", id, false).First(&unit).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &unit, nil
}

func (r *rtuUnitRepository) FindAll(ctx context.Context, search string, isActive *bool, showDeleted bool) ([]models.RTUUnit, error) {
	var units []models.RTUUnit
	query := r.db.WithContext(ctx).Where("is_deleted = ?", showDeleted)

	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	err := query.Order("name ASC").Find(&units).Error
	return units, err
}

func (r *rtuUnitRepository) Update(ctx context.Context, unit *models.RTUUnit) error {
	return r.db.WithContext(ctx).Save(unit).Error
}

func (r *rtuUnitRepository) Delete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.RTUUnit{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_deleted": true,
		"updated_by": deletedBy,
		"deleted_at": gorm.Expr("NOW()"),
	}).Error
}

func (r *rtuUnitRepository) Restore(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.RTUUnit{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_deleted": false,
		"deleted_at": nil,
	}).Error
}

func (r *rtuUnitRepository) FindByIDUnscoped(ctx context.Context, id uuid.UUID) (*models.RTUUnit, error) {
	var unit models.RTUUnit
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&unit).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &unit, nil
}

func (r *rtuUnitRepository) HardDelete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Unscoped().Where("id = ?", id).Delete(&models.RTUUnit{}).Error
}
