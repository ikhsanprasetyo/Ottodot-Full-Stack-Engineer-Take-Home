package models

import (
	"time"

	"github.com/google/uuid"
)

// RTUOutletMaterialVendor defines a specific vendor preference for a material at a specific location.
// e.g. Medan outlet uses Vendor A for chicken, but Jakarta outlet uses Vendor B for chicken.
type RTUOutletMaterialVendor struct {
	ID         uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	OutletID   uuid.UUID    `gorm:"type:uuid;uniqueIndex:idx_outlet_material_vendor;not null" json:"outletId"`
	Outlet     *Outlet      `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
	MaterialID uuid.UUID    `gorm:"type:uuid;uniqueIndex:idx_outlet_material_vendor;not null" json:"materialId"`
	Material   *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`

	PreferredVendorID uuid.UUID  `gorm:"type:uuid;not null" json:"preferredVendorId"`
	PreferredVendor   *RTUVendor `gorm:"foreignKey:PreferredVendorID" json:"preferredVendor,omitempty"`

	Notes     string    `json:"notes"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (RTUOutletMaterialVendor) TableName() string { return "rtu_outlet_material_vendors" }
