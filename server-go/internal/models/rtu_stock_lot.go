package models

import (
	"time"

	"github.com/google/uuid"
)

type RTUStockLot struct {
	ID           uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	MaterialID   *uuid.UUID   `gorm:"type:uuid;index" json:"materialId,omitempty"`
	Material     *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	ProductID    *uuid.UUID   `gorm:"type:uuid;index" json:"productId,omitempty"`
	Product      *RTUProduct  `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	OutletID     uuid.UUID    `gorm:"type:uuid;not null;index" json:"outletId"`
	Outlet       *Outlet      `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
	LotNumber    string       `gorm:"not null;uniqueIndex" json:"lotNumber"`

	QtyInitial   float64      `gorm:"type:decimal(14,3);not null" json:"qtyInitial"`
	QtyRemaining float64      `gorm:"type:decimal(14,3);not null" json:"qtyRemaining"`
	UnitPrice    float64      `gorm:"type:decimal(14,4);not null" json:"unitPrice"`

	RefType      string       `gorm:"not null" json:"refType"`
	RefID        uuid.UUID    `gorm:"type:uuid;not null;index" json:"refId"`

	ReceivedDate time.Time    `gorm:"not null;index" json:"receivedDate"`
	CreatedAt    time.Time    `gorm:"autoCreateTime" json:"createdAt"`

	Movements    []RTUStockLotMovement `gorm:"foreignKey:LotID" json:"movements,omitempty"`
}

func (RTUStockLot) TableName() string { return "rtu_stock_lots" }
