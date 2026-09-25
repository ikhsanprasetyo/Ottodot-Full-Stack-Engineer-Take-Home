package models

import (
	"time"

	"github.com/google/uuid"
)

// AIChatSession stores individual chat conversation threads per user
type AIChatSession struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index"                       json:"userId"`
	Title     string    `gorm:"type:varchar(255);not null;default:'Percakapan Baru'" json:"title"`
	IsDeleted bool      `gorm:"default:false;index"                            json:"isDeleted"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"                        json:"createdAt"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"                        json:"updatedAt"`

	Messages []AIChatMessage `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"messages,omitempty"`
}

func (AIChatSession) TableName() string { return "ai_chat_sessions" }

// AIChatMessage stores chat history turns within a session
type AIChatMessage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SessionID uuid.UUID `gorm:"type:uuid;not null;index"                       json:"sessionId"`
	Role      string    `gorm:"type:varchar(20);not null"                      json:"role"` // 'user' or 'assistant'
	Content   string    `gorm:"type:text;not null"                             json:"content"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"                        json:"createdAt"`
}

func (AIChatMessage) TableName() string { return "ai_chat_messages" }
