package models

import (
	"time"

	"github.com/google/uuid"
)

type RTUCategory struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	Name      string     `gorm:"uniqueIndex;not null" json:"name"`
	IsActive  bool       `gorm:"default:true" json:"isActive"`
	IsDeleted bool       `gorm:"default:false;index" json:"isDeleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

func (RTUCategory) TableName() string { return "rtu_categories" }
