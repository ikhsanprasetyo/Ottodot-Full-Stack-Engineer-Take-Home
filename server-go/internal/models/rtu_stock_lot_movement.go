package models

import (
	"time"

	"github.com/google/uuid"
)

type RTUStockLotMovement struct {
	ID          uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	LotID       uuid.UUID    `gorm:"type:uuid;not null;index" json:"lotId"`
	Lot         *RTUStockLot `gorm:"foreignKey:LotID" json:"lot,omitempty"`
	RefType     string       `gorm:"not null" json:"refType"` // e.g. "DISTRIBUTION", "INVOICE"
        RefID       uuid.UUID    `gorm:"type:uuid;not null;index" json:"refId"`
        QtyDeducted float64      `gorm:"type:decimal(14,3);not null" json:"qtyDeducted"`
        CreatedAt   time.Time    `gorm:"autoCreateTime" json:"createdAt"`
        RefInfo     string       `gorm:"-" json:"refInfo,omitempty"`
}

func (RTUStockLotMovement) TableName() string { return "rtu_stock_lot_movements" }
