package models

import (
	"time"

	"github.com/google/uuid"
)

// RTUOutletMaterialStock tracks inventory level for a material at a specific location
type RTUOutletMaterialStock struct {
	ID         uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	MaterialID uuid.UUID    `gorm:"type:uuid;uniqueIndex:idx_outlet_material;not null" json:"materialId"`
	Material   *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	OutletID   uuid.UUID    `gorm:"type:uuid;uniqueIndex:idx_outlet_material;not null" json:"outletId"`
	Outlet     *Outlet      `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`

	CurrentStock float64 `gorm:"type:decimal(14,3);default:0" json:"currentStock"`
	MinStock     float64 `gorm:"type:decimal(14,3);default:0" json:"minStock"`
	
	CurrentPrice  float64    `gorm:"type:decimal(20,8);default:0" json:"currentPrice"`
	LastPriceDate *time.Time `json:"lastPriceDate,omitempty"`
	
	UpdatedAt time.Time `json:"updatedAt"`
}

func (RTUOutletMaterialStock) TableName() string { return "rtu_outlet_material_stocks" }

// RTUOutletProductStock tracks finished goods inventory level at a specific location
type RTUOutletProductStock struct {
	ID        uuid.UUID   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	ProductID uuid.UUID   `gorm:"type:uuid;uniqueIndex:idx_outlet_product;not null" json:"productId"`
	Product   *RTUProduct `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	OutletID  uuid.UUID   `gorm:"type:uuid;uniqueIndex:idx_outlet_product;not null" json:"outletId"`
	Outlet    *Outlet     `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`

	CurrentStock float64 `gorm:"type:decimal(14,3);default:0" json:"currentStock"`
	CurrentPrice  float64    `gorm:"type:decimal(20,8);default:0" json:"currentPrice"`
	LastPriceDate *time.Time `json:"lastPriceDate,omitempty"`
	
	UpdatedAt time.Time `json:"updatedAt"`
}

func (RTUOutletProductStock) TableName() string { return "rtu_outlet_product_stocks" }
