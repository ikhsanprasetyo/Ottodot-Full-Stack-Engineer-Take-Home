package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUVendorRepository interface {
	Create(ctx context.Context, vendor *models.RTUVendor) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUVendor, error)
	FindAll(ctx context.Context, search string, isActive *bool, category string, showDeleted bool) ([]models.RTUVendor, error)
	Update(ctx context.Context, vendor *models.RTUVendor) error
	Delete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error
	Restore(ctx context.Context, id uuid.UUID, restoredBy *uuid.UUID) error
	HardDelete(ctx context.Context, id uuid.UUID) error
}

type rtuVendorRepository struct {
	db *gorm.DB
}

func NewRTUVendorRepository(db *gorm.DB) RTUVendorRepository {
	return &rtuVendorRepository{db}
}

func (r *rtuVendorRepository) Create(ctx context.Context, vendor *models.RTUVendor) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if vendor.ID == uuid.Nil {
			vendor.ID = uuid.New()
		}
		if err := tx.Create(vendor).Error; err != nil {
			return err
		}
		history := models.RTUVendorHistory{
			ID:          uuid.New(),
			VendorID:    vendor.ID,
			Action:      "CREATED",
			Changes:     "Vendor " + vendor.Name + " (" + vendor.Code + ") dibuat",
			PerformedBy: vendor.CreatedBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuVendorRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUVendor, error) {
	var vendor models.RTUVendor
	err := r.db.WithContext(ctx).
		Preload("Creator").
		Preload("Creator.Position").
		Preload("Updater").
		Preload("Updater.Position").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Preload("Histories.Performer.Position").
		Where("id = ? AND is_deleted = ?", id, false).
		First(&vendor).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &vendor, nil
}

func (r *rtuVendorRepository) FindAll(ctx context.Context, search string, isActive *bool, category string, showDeleted bool) ([]models.RTUVendor, error) {
	var vendors []models.RTUVendor
	query := r.db.WithContext(ctx).
		Preload("Creator").
		Preload("Creator.Position").
		Preload("Updater").
		Preload("Updater.Position").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Preload("Histories.Performer.Position").
		Where("is_deleted = ?", showDeleted)

	if search != "" {
		query = query.Where("name ILIKE ? OR code ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}

	if category != "" {
		query = query.Where("category = ?", category)
	}

	err := query.Order("name ASC").Find(&vendors).Error
	return vendors, err
}

func (r *rtuVendorRepository) Update(ctx context.Context, vendor *models.RTUVendor) error {
	var oldVendor models.RTUVendor
	_ = r.db.WithContext(ctx).Where("id = ?", vendor.ID).First(&oldVendor).Error

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(vendor).Error; err != nil {
			return err
		}
		history := models.RTUVendorHistory{
			ID:          uuid.New(),
			VendorID:    vendor.ID,
			Action:      "UPDATED",
			Changes:     compareVendorChanges(&oldVendor, vendor),
			PerformedBy: vendor.UpdatedBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuVendorRepository) Delete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.RTUVendor{}).Where("id = ?", id).Updates(map[string]interface{}{
			"is_deleted": true,
			"updated_by": deletedBy,
			"deleted_at": gorm.Expr("NOW()"),
		}).Error; err != nil {
			return err
		}
		history := models.RTUVendorHistory{
			ID:          uuid.New(),
			VendorID:    id,
			Action:      "DELETED",
			Changes:     "Vendor dipindahkan ke Recycle Bin",
			PerformedBy: &deletedBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuVendorRepository) Restore(ctx context.Context, id uuid.UUID, restoredBy *uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.RTUVendor{}).Where("id = ?", id).Updates(map[string]interface{}{
			"is_deleted": false,
			"deleted_at": nil,
		}).Error; err != nil {
			return err
		}
		history := models.RTUVendorHistory{
			ID:          uuid.New(),
			VendorID:    id,
			Action:      "RESTORED",
			Changes:     "Vendor dipulihkan dari Recycle Bin",
			PerformedBy: restoredBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuVendorRepository) HardDelete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Unscoped().Delete(&models.RTUVendor{}, id).Error
}
