package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type PositionRepository struct {
	db *gorm.DB
}

func NewPositionRepository(db *gorm.DB) *PositionRepository {
	return &PositionRepository{db: db}
}

// FindByID finds position by UUID
func (r *PositionRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.Position, error) {
	var pos models.Position
	err := r.db.WithContext(ctx).
		Where("id = ? AND is_deleted = false", id).
		First(&pos).Error
	
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &pos, err
}

// List lists positions with pagination and filtering
func (r *PositionRepository) List(ctx context.Context, search string, offset, limit int, includeDeleted bool) ([]*models.Position, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.Position{})
	
	if !includeDeleted {
		query = query.Where("is_deleted = false")
	}

	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}
	
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	var positions []*models.Position
	err := query.
		Offset(offset).
		Limit(limit).
		Order("name ASC").
		Find(&positions).Error
	
	return positions, total, err
}

// Create creates a new position
func (r *PositionRepository) Create(ctx context.Context, pos *models.Position, userID uuid.UUID) error {
	// GORM will auto-generate UUID if defined as primaryKey and default:gen_random_uuid()
	// But we can set it here too if we want
	if pos.ID == uuid.Nil {
		pos.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(pos).Error
}

// Update updates a position
func (r *PositionRepository) Update(ctx context.Context, id uuid.UUID, updates map[string]any, userID uuid.UUID) (*models.Position, error) {
	updates["updated_at"] = time.Now()
	err := r.db.WithContext(ctx).Model(&models.Position{}).
		Where("id = ? AND is_deleted = false", id).
		Updates(updates).Error
	if err != nil {
		return nil, err
	}
	return r.FindByID(ctx, id)
}

// SoftDelete soft deletes a position
func (r *PositionRepository) SoftDelete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.Position{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"is_deleted": true,
			"deleted_at": time.Now(),
		}).Error
}

// Restore restores a soft-deleted position
func (r *PositionRepository) Restore(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*models.Position, error) {
	err := r.db.WithContext(ctx).Model(&models.Position{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"is_deleted": false,
			"deleted_at": nil,
		}).Error
	if err != nil {
		return nil, err
	}
	return r.FindByID(ctx, id)
}
