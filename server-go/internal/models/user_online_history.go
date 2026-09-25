package models

import (
	"time"

	"github.com/google/uuid"
)

type UserOnlineHistory struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	ActiveCount int       `gorm:"default:0" json:"active_count"`
	UserNames   string    `gorm:"type:text" json:"userNames"`
	Timestamp   time.Time `gorm:"index" json:"timestamp"`
}

func (UserOnlineHistory) TableName() string { return "user_online_histories" }
