package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RTUProduct is the final product to be manufactured in Central Kitchen
type RTUProduct struct {
	ID          uuid.UUID      `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"_id"`
	Code        string         `gorm:"uniqueIndex;not null" json:"code"`
	Name        string         `gorm:"not null" json:"name"`
	Category    string         `json:"category"`
	OutputUnit  string         `gorm:"not null" json:"outputUnit"` // e.g. "kg", "pcs", "porsi"
	Description string         `json:"description"`
	CurrentStock float64       `gorm:"default:0" json:"currentStock"`
	MinStock     float64       `gorm:"type:decimal(14,3);default:0" json:"minStock"`
	CurrentPrice  float64      `gorm:"type:decimal(20,8);default:0" json:"currentPrice"`
	LastPriceDate *time.Time   `json:"lastPriceDate,omitempty"`
	IsActive     bool          `gorm:"default:true" json:"isActive"`
	
	// Relationship
	// 1 Product -> 1 Recipe (Recipe entity handles multiversion internally)
	Recipe *RTURecipe `gorm:"foreignKey:ProductID" json:"recipe,omitempty"`
	
	Barcode       string           `gorm:"type:varchar(100);index" json:"barcode"`
	Units         []RTUProductUnit `gorm:"foreignKey:ProductID" json:"units"`
	ImageURL      string           `gorm:"type:text" json:"imageUrl"`

	IsDeleted   bool               `gorm:"default:false" json:"isDeleted"`
	DeletedAt   *time.Time         `json:"deletedAt"`
	CreatedBy   *uuid.UUID         `gorm:"type:uuid" json:"createdBy,omitempty"`
	Creator     *User              `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	UpdatedBy   *uuid.UUID         `gorm:"type:uuid" json:"updatedBy,omitempty"`
	Updater     *User              `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
	CreatedAt   time.Time          `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time          `gorm:"autoUpdateTime" json:"updatedAt"`

	Histories   []RTUProductHistory `gorm:"foreignKey:ProductID" json:"histories"`
}

type RTUProductHistory struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	ProductID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"productId"`
	Action      string     `gorm:"type:varchar(50);not null" json:"action"` // CREATED, UPDATED, DELETED, RESTORED
	Changes     string     `gorm:"type:text" json:"changes"`
	PerformedBy *uuid.UUID `gorm:"type:uuid" json:"performedBy,omitempty"`
	Performer   *User      `gorm:"foreignKey:PerformedBy" json:"performer,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

func (RTUProductHistory) TableName() string { return "rtu_product_histories" }

func (m *RTUProduct) BeforeSave(tx *gorm.DB) (err error) {
	return nil
}
