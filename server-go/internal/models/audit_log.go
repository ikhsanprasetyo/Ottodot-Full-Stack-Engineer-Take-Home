package models

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Entity    string    `gorm:"type:varchar(100);index;not null" json:"entity"`    // e.g. "kpi_evaluation"
	EntityID  uuid.UUID `gorm:"type:uuid;index;not null"          json:"entityId"`
	Operation string    `gorm:"type:varchar(20);not null"        json:"operation"` // CREATE, UPDATE, DELETE
	
	// Changes stores the diff as a list of Change objects
	Changes JSONB[[]Change] `gorm:"type:jsonb;default:'[]'" json:"changes"`
	
	UserID    uuid.UUID `gorm:"type:uuid;index;not null" json:"userId"`
	User      *User     `gorm:"foreignKey:UserID"        json:"user,omitempty"`
	
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"createdAt"`
}

type Change struct {
	Field    string      `json:"field"`
	SubField string      `json:"subField,omitempty"` // For nested structures like Pillars
	OldValue any         `json:"oldValue"`
	NewValue any         `json:"newValue"`
}

func (AuditLog) TableName() string { return "audit_logs" }
