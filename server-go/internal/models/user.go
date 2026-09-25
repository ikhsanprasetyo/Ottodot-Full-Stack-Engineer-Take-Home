package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents user account for Authentication (Parent or Admin)
type User struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name         string         `gorm:"type:varchar(255);not null" json:"name"`
	Email        string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Password     string         `gorm:"type:varchar(255);not null" json:"-"`
	Role         string         `gorm:"type:varchar(50);not null;default:'parent'" json:"role"` // 'parent' or 'admin'
	Phone        *string        `gorm:"type:varchar(50)" json:"phone,omitempty"`
	TokenVersion int            `gorm:"default:1" json:"-"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (User) TableName() string {
	return "users"
}
