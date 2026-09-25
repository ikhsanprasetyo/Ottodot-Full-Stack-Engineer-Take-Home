package models

import (
	"time"

	"github.com/google/uuid"
)

// RTUPriceBackup stores snapshots of material/product prices per outlet in database for rollback
type RTUPriceBackup struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	EntityType     string     `gorm:"type:varchar(50);not null;index" json:"entityType"` // "MATERIAL" or "PRODUCT"
	TargetOutletID uuid.UUID  `gorm:"type:uuid;not null;index" json:"targetOutletId"`
	TargetOutlet   *Outlet    `gorm:"foreignKey:TargetOutletID" json:"targetOutlet,omitempty"`
	SourceOutletID *uuid.UUID `gorm:"type:uuid;index" json:"sourceOutletId,omitempty"`
	SourceOutlet   *Outlet    `gorm:"foreignKey:SourceOutletID" json:"sourceOutlet,omitempty"`
	Notes          string     `gorm:"type:text" json:"notes"`
	BackupData     string     `gorm:"type:jsonb;not null" json:"backupData"` // JSON array of price items

	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	Creator   *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	CreatedAt time.Time  `gorm:"index" json:"createdAt"`
}

func (RTUPriceBackup) TableName() string { return "rtu_price_backups" }
