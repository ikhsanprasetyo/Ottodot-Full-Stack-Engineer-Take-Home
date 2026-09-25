package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RTUGRN struct {
	ID          uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	GRNNumber   string       `gorm:"uniqueIndex;not null" json:"grnNumber"` // e.g., GRN-20260420-001
	OutletID    uuid.UUID    `gorm:"type:uuid;not null;index" json:"outletId"`
	Outlet      *Outlet      `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
	VendorID    *uuid.UUID   `gorm:"type:uuid;index" json:"vendorId,omitempty"`
	Vendor      *RTUVendor   `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	PurchaseID  *uuid.UUID   `gorm:"type:uuid;index" json:"purchaseId,omitempty"`
	Purchase    *RTUPurchase `gorm:"foreignKey:PurchaseID" json:"purchase,omitempty"`
	Status      string       `gorm:"default:'DRAFT';not null" json:"status"` // DRAFT, CONFIRMED, CANCELLED
	ReceiptDate time.Time    `gorm:"not null" json:"receiptDate"`
	Notes       *string      `json:"notes,omitempty"`

	PaymentType  string  `gorm:"type:varchar(20);default:'Pelunasan'" json:"paymentType"` // DP, Pelunasan
	DPAmount     float64 `gorm:"type:decimal(14,2);default:0" json:"dpAmount"`
	TaxPercent   float64 `gorm:"type:decimal(5,2);default:0" json:"taxPercent"`
	ShippingFee  float64 `gorm:"type:decimal(14,2);default:0" json:"shippingFee"`
	LoadingFee   float64 `gorm:"type:decimal(14,2);default:0" json:"loadingFee"`
	UnloadingFee float64 `gorm:"type:decimal(14,2);default:0" json:"unloadingFee"`
	AdditionalCosts []AdditionalCost `gorm:"type:jsonb;serializer:json;default:'[]'" json:"additionalCosts"`

	TotalAmount float64      `gorm:"type:decimal(14,4);default:0" json:"totalAmount"`
	Items       []RTUGRNItem `gorm:"foreignKey:GRNID" json:"items"`

	IsDeleted bool       `gorm:"default:false;index" json:"isDeleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`

	Creator *User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater *User `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`

	Histories []RTUGRNHistory `gorm:"foreignKey:GRNID" json:"histories"`
}

func (RTUGRN) TableName() string { return "rtu_grns" }

type RTUGRNHistory struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	GRNID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"grnId"`
	Action      string     `gorm:"type:varchar(50);not null" json:"action"`
	Changes     string     `gorm:"type:text" json:"changes"`
	PerformedBy *uuid.UUID `gorm:"type:uuid" json:"performedBy"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"createdAt"`

	Performer *User `gorm:"foreignKey:PerformedBy" json:"performer,omitempty"`
}

func (RTUGRNHistory) TableName() string { return "rtu_grn_histories" }

type RTUGRNItem struct {
	ID          uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	GRNID       uuid.UUID    `gorm:"type:uuid;not null;index" json:"grnId"`
	MaterialID  uuid.UUID    `gorm:"type:uuid;not null;index" json:"materialId"`
	Material    *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	QtyReceived float64      `gorm:"type:decimal(14,3);not null" json:"qtyReceived"`
	Unit        string       `gorm:"not null" json:"unit"`
	Conversion  float64      `gorm:"type:decimal(14,4);default:1" json:"conversion"`
	UnitPrice   float64      `gorm:"type:decimal(14,4);not null" json:"unitPrice"`
	Discount    float64      `gorm:"type:decimal(5,2);default:0" json:"discount"`
	Subtotal    float64      `gorm:"type:decimal(14,4);not null" json:"subtotal"`
}

func (RTUGRNItem) TableName() string { return "rtu_grn_items" }

func (m *RTUGRN) BeforeCreate(tx *gorm.DB) (err error) {
	if m.GRNNumber == "" {
		var abbrev string
		if m.OutletID != uuid.Nil {
			var outlet Outlet
			if err := tx.Select("abbreviation").First(&outlet, "id = ?", m.OutletID).Error; err == nil {
				if outlet.Abbreviation != nil && *outlet.Abbreviation != "" {
					abbrev = *outlet.Abbreviation
				}
			}
		}
		prefix := "GRN-"
		if abbrev != "" {
			prefix = fmt.Sprintf("GRN-%s-", abbrev)
		}
		dateStr := time.Now().Format("20060102")
		if !m.ReceiptDate.IsZero() {
			dateStr = m.ReceiptDate.Format("20060102")
		}
		m.GRNNumber = fmt.Sprintf("%s%s-%s", prefix, dateStr, uuid.New().String()[:8])
	}
	return nil
}
