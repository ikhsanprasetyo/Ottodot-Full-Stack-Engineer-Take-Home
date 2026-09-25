package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type OutletRepository struct {
	db *gorm.DB
}

func NewOutletRepository(db *gorm.DB) *OutletRepository {
	return &OutletRepository{db: db}
}

func (r *OutletRepository) GetDB() *gorm.DB {
	return r.db
}

// FindByID finds outlet by UUID
func (r *OutletRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.Outlet, error) {
	var outlet models.Outlet
	err := r.db.WithContext(ctx).
		Where("id = ? AND is_deleted = false", id).
		First(&outlet).Error
	
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &outlet, err
}

// FindByName finds outlet by name
func (r *OutletRepository) FindByName(ctx context.Context, name string) (*models.Outlet, error) {
	var outlet models.Outlet
	err := r.db.WithContext(ctx).
		Where("name = ? AND is_deleted = false", name).
		First(&outlet).Error

	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &outlet, err
}

// List lists outlets with search and pagination
func (r *OutletRepository) List(ctx context.Context, search string, offset, limit int64, includeDeleted bool, allowedOutletIDs []uuid.UUID, orderBy string) ([]*models.Outlet, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.Outlet{})
	
	if !includeDeleted {
		query = query.Where("is_deleted = false")
	}

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ? OR label ILIKE ?", like, like)
	}

	if len(allowedOutletIDs) > 0 {
		query = query.Where("id IN ?", allowedOutletIDs)
	}
	
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	var outlets []*models.Outlet
	dbQuery := query.Offset(int(offset)).Limit(int(limit))
	
	if orderBy != "" {
		dbQuery = dbQuery.Order(orderBy)
	} else {
		dbQuery = dbQuery.Order("name ASC")
	}
	
	err := dbQuery.Find(&outlets).Error
	
	return outlets, total, err
}

// Create creates a new outlet
func (r *OutletRepository) Create(ctx context.Context, outlet *models.Outlet) error {
	return r.db.WithContext(ctx).Create(outlet).Error
}

// Update updates an outlet with a map of changes
func (r *OutletRepository) Update(ctx context.Context, id uuid.UUID, updates map[string]any, userID *uuid.UUID) (*models.Outlet, error) {
	updates["updated_at"] = time.Now()
	if userID != nil {
		updates["updated_by"] = userID
	}
	
	err := r.db.WithContext(ctx).
		Model(&models.Outlet{}).
		Where("id = ?", id).
		Updates(updates).Error
	
	if err != nil {
		return nil, err
	}
	
	return r.FindByID(ctx, id)
}

// SoftDelete soft deletes an outlet
func (r *OutletRepository) SoftDelete(ctx context.Context, id uuid.UUID, userID *uuid.UUID) error {
	updates := map[string]any{
		"is_deleted": true,
		"deleted_at": time.Now(),
		"updated_at": time.Now(),
	}
	if userID != nil {
		updates["updated_by"] = userID
	}
	
	return r.db.WithContext(ctx).
		Model(&models.Outlet{}).
		Where("id = ?", id).
		Updates(updates).Error
}

// Restore restores a deleted outlet
func (r *OutletRepository) Restore(ctx context.Context, id uuid.UUID, userID *uuid.UUID) (*models.Outlet, error) {
	updates := map[string]any{
		"is_deleted": false,
		"deleted_at": nil,
		"updated_at": time.Now(),
	}
	if userID != nil {
		updates["updated_by"] = userID
	}
	
	err := r.db.WithContext(ctx).
		Model(&models.Outlet{}).
		Where("id = ?", id).
		Updates(updates).Error
	
	if err != nil {
		return nil, err
	}
	
	return r.FindByID(ctx, id)
}

// FindIn finds outlets by multiple UUIDs
func (r *OutletRepository) FindIn(ctx context.Context, ids []uuid.UUID) ([]models.Outlet, error) {
	if len(ids) == 0 {
		return []models.Outlet{}, nil
	}

	var outlets []models.Outlet
	err := r.db.WithContext(ctx).
		Where("id IN ?", ids).
		Find(&outlets).Error
	
	return outlets, err
}
