package models

import (
	"time"

	"github.com/google/uuid"
)

// RTUProductUnit represents additional units of measurement for a product
// The Conversion factor is always relative to the base unit (OutputUnit in RTUProduct)
// e.g. Base Unit = "Pcs", UnitName = "Dus", Conversion = 12 -> 1 Dus = 12 Pcs
type RTUProductUnit struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	ProductID  uuid.UUID  `gorm:"type:uuid;not null;index;constraint:OnDelete:CASCADE;" json:"productId"`
	UnitName           string     `gorm:"type:varchar(50);not null" json:"unitName"`
	Conversion         float64    `gorm:"type:decimal(14,4);not null" json:"conversion"`
	RelativeToUnit     *string    `gorm:"type:varchar(50)" json:"relativeToUnit,omitempty"`
	RelativeConversion *float64   `gorm:"type:decimal(14,4)" json:"relativeConversion,omitempty"`
	Barcode            string     `gorm:"type:varchar(100);index" json:"barcode"`
	CreatedAt          time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt          time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (RTUProductUnit) TableName() string { return "rtu_product_units" }
