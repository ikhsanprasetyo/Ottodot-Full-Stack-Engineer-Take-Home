package models

import (
	"time"

	"github.com/google/uuid"
)

type DistributionStatus string
type DistributionType string

const (
	DistributionStatusDraft     DistributionStatus = "DRAFT"
	DistributionStatusShipped   DistributionStatus = "SHIPPED"
	DistributionStatusReceived  DistributionStatus = "RECEIVED"
	DistributionStatusCancelled DistributionStatus = "CANCELLED"

	DistributionTypeProduct  DistributionType = "PRODUCT"
	DistributionTypeMaterial DistributionType = "MATERIAL"
)

type RTUDistribution struct {
	ID           uuid.UUID          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	DocNumber    string             `gorm:"uniqueIndex;not null" json:"docNumber"`
	OutletID       *uuid.UUID         `gorm:"type:uuid" json:"outletId,omitempty"`
	Outlet         *Outlet            `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
	VendorID       *uuid.UUID         `gorm:"type:uuid;index" json:"vendorId,omitempty"`
	Vendor         *RTUVendor         `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	SourceOutletID *uuid.UUID         `gorm:"type:uuid" json:"sourceOutletId,omitempty"`
	SourceOutlet   *Outlet            `gorm:"foreignKey:SourceOutletID" json:"sourceOutlet,omitempty"`
	Type           DistributionType   `gorm:"type:varchar(20);default:'PRODUCT'" json:"type"` // PRODUCT or MATERIAL
	Status       DistributionStatus `gorm:"type:string;default:'DRAFT'" json:"status"`
	ShipmentDate *time.Time         `json:"shipmentDate"`
	ReceivedDate *time.Time         `json:"receivedDate"`
	Notes        string             `json:"notes"`
	Items        []RTUDistributionItem `gorm:"foreignKey:DistributionID" json:"items"`

	IsDeleted bool       `gorm:"default:false" json:"isDeleted"`
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`

	Creator *User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater *User `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`

	Histories []RTUDistributionHistory `gorm:"foreignKey:DistributionID" json:"histories"`
}

func (RTUDistribution) TableName() string { return "rtu_distributions" }

type RTUDistributionHistory struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	DistributionID uuid.UUID  `gorm:"type:uuid;not null;index" json:"distributionId"`
	Action         string     `gorm:"type:varchar(50);not null" json:"action"`
	Changes        string     `gorm:"type:text" json:"changes"`
	PerformedBy    *uuid.UUID `gorm:"type:uuid" json:"performedBy"`
	CreatedAt      time.Time  `gorm:"autoCreateTime" json:"createdAt"`

	Performer *User `gorm:"foreignKey:PerformedBy" json:"performer,omitempty"`
}

func (RTUDistributionHistory) TableName() string { return "rtu_distribution_histories" }

// RTUDistributionItem holds one line of goods in a shipment.
// Either ProductID or MaterialID is populated depending on the parent distribution's Type.
type RTUDistributionItem struct {
	ID             uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	DistributionID uuid.UUID    `gorm:"type:uuid;not null;index" json:"distributionId"`
	ProductID      *uuid.UUID   `gorm:"type:uuid;index" json:"productId,omitempty"`
	Product        *RTUProduct  `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	MaterialID     *uuid.UUID   `gorm:"type:uuid;index" json:"materialId,omitempty"`
	Material       *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	Qty            float64      `gorm:"not null" json:"qty"`
	Unit           string       `json:"unit"`
	UnitPrice      float64      `gorm:"type:decimal(14,4);default:0" json:"unitPrice"` // FIFO cost at shipment time
	Notes          string       `json:"notes"`
}

func (RTUDistributionItem) TableName() string { return "rtu_distribution_items" }

