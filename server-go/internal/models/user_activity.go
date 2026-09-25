package models

import (
	"time"

	"github.com/google/uuid"
)

// UserActivity is a vertically partitioned table for high-frequency updates
// to prevent "Fat Row Bloat" in the main users table.
type UserActivity struct {
	UserID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"userId"`
	LastSeenAt time.Time `gorm:"index"                json:"lastSeenAt"`
	IsOnline   bool      `gorm:"index"                json:"isOnline"`
	
	// Optional: link back to user
	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (UserActivity) TableName() string { return "user_activities" }
