package models

import (
	"time"

	"github.com/google/uuid"
)

type Position struct {
	ID   uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	Name string    `gorm:"not null;uniqueIndex" json:"name"`

	IsDeleted bool       `gorm:"default:false" json:"isDeleted"`
	DeletedAt *time.Time `                     json:"deletedAt,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (Position) TableName() string { return "positions" }
