package models

import (
	"time"

	"github.com/google/uuid"
)

type RTUBank struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	Name      string     `gorm:"type:varchar(100);not null;uniqueIndex" json:"name"`
	Label     string     `gorm:"type:varchar(100);not null" json:"label"`
	IsDeleted bool       `gorm:"default:false;index" json:"isDeleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

func (RTUBank) TableName() string { return "rtu_banks" }
