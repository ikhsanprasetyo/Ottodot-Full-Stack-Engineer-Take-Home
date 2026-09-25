package models

import (
	"time"

	"github.com/google/uuid"
)

type RTUMaterial struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	Code          string     `gorm:"uniqueIndex;not null" json:"code"`
	Name          string     `gorm:"not null" json:"name"`
	Brand         string     `json:"brand"`
	Category      string     `json:"category"`
	Unit          string     `gorm:"not null" json:"unit"`
	VendorID      *uuid.UUID `gorm:"type:uuid;index" json:"vendorId,omitempty"`
	Vendor        *RTUVendor `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	Barcode       string     `gorm:"type:varchar(100);index" json:"barcode"`
	Units         []RTUMaterialUnit `gorm:"foreignKey:MaterialID" json:"units"`
	ImageURL      string     `gorm:"type:text" json:"imageUrl"`
	
	CurrentPrice  float64    `gorm:"type:decimal(20,8);default:0" json:"currentPrice"`
	LastPriceDate *time.Time `json:"lastPriceDate,omitempty"`
	CurrentStock  float64    `gorm:"type:decimal(14,3);default:0" json:"currentStock"`
	MinStock      float64    `gorm:"type:decimal(14,3);default:0" json:"minStock"`
	IsActive      bool       `gorm:"default:true" json:"isActive"`
	Description   *string    `json:"description,omitempty"`

	IsDeleted bool       `gorm:"default:false;index" json:"isDeleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	Creator   *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	Updater   *User      `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`

	Histories []RTUMaterialHistory `gorm:"foreignKey:MaterialID" json:"histories"`
}

func (RTUMaterial) TableName() string { return "rtu_materials" }

type RTUMaterialHistory struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	MaterialID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"materialId"`
	Action      string     `gorm:"type:varchar(50);not null" json:"action"` // CREATED, UPDATED, DELETED, RESTORED
	Changes     string     `gorm:"type:text" json:"changes"`
	PerformedBy *uuid.UUID `gorm:"type:uuid" json:"performedBy,omitempty"`
	Performer   *User      `gorm:"foreignKey:PerformedBy" json:"performer,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

func (RTUMaterialHistory) TableName() string { return "rtu_material_histories" }

type RTUMaterialPriceHistory struct {
	ID            uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	MaterialID    uuid.UUID    `gorm:"type:uuid;not null;index" json:"materialId"`
	Material      *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	OutletID      *uuid.UUID   `gorm:"type:uuid;index" json:"outletId,omitempty"`
	Outlet        *Outlet      `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
	VendorID      *uuid.UUID   `gorm:"type:uuid;index" json:"vendorId,omitempty"`
	Vendor        *RTUVendor   `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	Price         float64      `gorm:"type:decimal(20,8);not null" json:"price"`
	EffectiveDate time.Time    `gorm:"not null" json:"effectiveDate"`
	Source        string       `gorm:"default:'manual'" json:"source"`
	Notes         *string      `json:"notes,omitempty"`
	CreatedBy     *uuid.UUID   `gorm:"type:uuid" json:"createdBy,omitempty"`
	CreatedAt     time.Time    `json:"createdAt"`
}

func (RTUMaterialPriceHistory) TableName() string { return "rtu_material_price_histories" }

type RTUStockLedger struct {
	ID           uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	MaterialID   *uuid.UUID   `gorm:"type:uuid;index" json:"materialId,omitempty"`
	Material     *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	ProductID    *uuid.UUID   `gorm:"type:uuid;index" json:"productId,omitempty"`
	Product      *RTUProduct  `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	OutletID     uuid.UUID    `gorm:"type:uuid;not null;index" json:"outletId"`
	Outlet       *Outlet      `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
	MovementType string       `gorm:"not null;index" json:"movementType"`
	Qty          float64      `gorm:"type:decimal(14,3);not null" json:"qty"`
	Unit         string       `gorm:"not null" json:"unit"`
	RefType      string       `json:"refType"`
	RefID        *uuid.UUID   `gorm:"type:uuid;index" json:"refId,omitempty"`
	BalanceAfter float64      `gorm:"type:decimal(14,3)" json:"balanceAfter"`
	PriceAtTime  float64      `gorm:"type:decimal(20,8);default:0" json:"priceAtTime"`
	Notes        *string      `json:"notes,omitempty"`
	CreatedBy    *uuid.UUID   `gorm:"type:uuid" json:"createdBy,omitempty"`
	Creator      *User        `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	CreatedAt    time.Time    `gorm:"index" json:"createdAt"`
}

func (RTUStockLedger) TableName() string { return "rtu_stock_ledgers" }
