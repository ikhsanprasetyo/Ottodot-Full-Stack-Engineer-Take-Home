package repositories

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/kpi-backend/internal/models"
)

type RTUPriceBackupRepository interface {
	CreateBackup(ctx context.Context, backup *models.RTUPriceBackup) error
	GetBackups(ctx context.Context, entityType string, targetOutletID *uuid.UUID) ([]models.RTUPriceBackup, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.RTUPriceBackup, error)
}

type rtuPriceBackupRepository struct {
	db *gorm.DB
}

func NewRTUPriceBackupRepository(db *gorm.DB) RTUPriceBackupRepository {
	return &rtuPriceBackupRepository{db: db}
}

func (r *rtuPriceBackupRepository) CreateBackup(ctx context.Context, backup *models.RTUPriceBackup) error {
	return r.db.WithContext(ctx).Create(backup).Error
}

func (r *rtuPriceBackupRepository) GetBackups(ctx context.Context, entityType string, targetOutletID *uuid.UUID) ([]models.RTUPriceBackup, error) {
	var backups []models.RTUPriceBackup
	query := r.db.WithContext(ctx).
		Preload("TargetOutlet").
		Preload("SourceOutlet").
		Preload("Creator").
		Order("created_at DESC")

	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}

	if targetOutletID != nil {
		query = query.Where("target_outlet_id = ?", *targetOutletID)
	}

	err := query.Find(&backups).Error
	return backups, err
}

func (r *rtuPriceBackupRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.RTUPriceBackup, error) {
	var backup models.RTUPriceBackup
	err := r.db.WithContext(ctx).
		Preload("TargetOutlet").
		Preload("SourceOutlet").
		Preload("Creator").
		Where("id = ?", id).First(&backup).Error
	if err != nil {
		return nil, err
	}
	return &backup, nil
}
