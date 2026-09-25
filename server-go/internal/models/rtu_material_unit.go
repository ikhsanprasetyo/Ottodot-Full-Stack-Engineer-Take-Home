package models

import (
	"time"

	"github.com/google/uuid"
)

// RTUMaterialUnit represents additional units of measurement for a material.
// Accurate-style UoM conversion:
//   - Conversion      = final conversion TO BASE unit (always stored, used by GRN/price/stock)
//   - RelativeToUnit  = which intermediate unit this is relative to (optional, nil = relative to base)
//   - RelativeConversion = user-entered value: 1 [UnitName] = RelativeConversion [RelativeToUnit]
// Example: Base=ml, Pcs=600ml, Dus → RelativeToUnit=Pcs, RelativeConversion=48, Conversion=28800
type RTUMaterialUnit struct {
	ID                 uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	MaterialID         uuid.UUID `gorm:"type:uuid;not null;index;constraint:OnDelete:CASCADE;" json:"materialId"`
	UnitName           string    `gorm:"type:varchar(50);not null" json:"unitName"`
	Conversion         float64   `gorm:"type:decimal(14,4);not null" json:"conversion"`
	RelativeToUnit     *string   `gorm:"type:varchar(50)" json:"relativeToUnit,omitempty"`
	RelativeConversion *float64  `gorm:"type:decimal(14,4)" json:"relativeConversion,omitempty"`
	Barcode            string    `gorm:"type:varchar(100);index" json:"barcode"`
	CreatedAt          time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt          time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

func (RTUMaterialUnit) TableName() string { return "rtu_material_units" }

