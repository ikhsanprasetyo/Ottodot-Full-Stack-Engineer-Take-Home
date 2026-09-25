package models

import (
	"time"

	"github.com/google/uuid"
)

type PurchaseStatus string
type PurchaseType string

const (
	PurchaseStatusDraft      PurchaseStatus = "DRAFT"
	PurchaseStatusProcessing PurchaseStatus = "PROCESSING"
	PurchaseStatusCompleted  PurchaseStatus = "COMPLETED"
	PurchaseStatusCancelled  PurchaseStatus = "CANCELLED"

	PurchaseTypeProduct  PurchaseType = "PRODUCT"
	PurchaseTypeMaterial PurchaseType = "MATERIAL"
)

// RTUPurchase is a Purchase Order initiated by the buyer outlet to request stock
// from another seller outlet (inter-outlet purchase).
type RTUPurchase struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	DocNumber   string         `gorm:"uniqueIndex;not null" json:"docNumber"`
	BuyerID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"buyerId"`
	Buyer       *Outlet        `gorm:"foreignKey:BuyerID" json:"buyer,omitempty"`
	SellerID    *uuid.UUID     `gorm:"type:uuid;index" json:"sellerId,omitempty"`
	Seller      *Outlet        `gorm:"foreignKey:SellerID" json:"seller,omitempty"`
	VendorID    *uuid.UUID     `gorm:"type:uuid;index" json:"vendorId,omitempty"`
	Vendor      *RTUVendor     `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	Type        PurchaseType   `gorm:"type:varchar(20);not null" json:"type"` // PRODUCT or MATERIAL
	Status      PurchaseStatus `gorm:"type:varchar(20);default:'DRAFT'" json:"status"`
	IsLoan      bool           `gorm:"default:false" json:"isLoan"`
	Notes       string         `json:"notes"`

	PaymentType string  `gorm:"type:varchar(20);default:'Pelunasan'" json:"paymentType"` // DP, Pelunasan
	DPAmount    float64 `gorm:"type:decimal(14,2);default:0" json:"dpAmount"`
	TaxPercent  float64 `gorm:"type:decimal(5,2);default:0" json:"taxPercent"`
	ShippingFee  float64 `gorm:"type:decimal(14,2);default:0" json:"shippingFee"`
	LoadingFee   float64 `gorm:"type:decimal(14,2);default:0" json:"loadingFee"`
	UnloadingFee float64 `gorm:"type:decimal(14,2);default:0" json:"unloadingFee"`
	AdditionalCosts []AdditionalCost `gorm:"type:jsonb;serializer:json;default:'[]'" json:"additionalCosts"`

	RequestDate  time.Time  `gorm:"not null" json:"requestDate"`
	ProcessDate  *time.Time `json:"processDate"`
	ReceivedDate *time.Time `json:"receivedDate"`

	Items []RTUPurchaseItem `gorm:"foreignKey:PurchaseID" json:"items"`

	IsDeleted bool       `gorm:"default:false" json:"isDeleted"`
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`

	Creator *User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater *User `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`

	Histories []RTUPurchaseHistory `gorm:"foreignKey:PurchaseID" json:"histories"`
}

func (RTUPurchase) TableName() string { return "rtu_purchases" }

type RTUPurchaseHistory struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	PurchaseID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"purchaseId"`
	Action      string     `gorm:"type:varchar(50);not null" json:"action"`
	Changes     string     `gorm:"type:text" json:"changes"`
	PerformedBy *uuid.UUID `gorm:"type:uuid" json:"performedBy"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"createdAt"`

	Performer *User `gorm:"foreignKey:PerformedBy" json:"performer,omitempty"`
}

func (RTUPurchaseHistory) TableName() string { return "rtu_purchase_histories" }

// RTUPurchaseItem is a line item in a Purchase Order.
// Either ProductID or MaterialID is set depending on Type.
type RTUPurchaseItem struct {
	ID         uuid.UUID   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	PurchaseID uuid.UUID   `gorm:"type:uuid;not null;index" json:"purchaseId"`
	ProductID  *uuid.UUID  `gorm:"type:uuid;index" json:"productId,omitempty"`
	Product    *RTUProduct `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	MaterialID *uuid.UUID  `gorm:"type:uuid;index" json:"materialId,omitempty"`
	Material   *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	Qty        float64     `gorm:"type:decimal(14,3);not null" json:"qty"`
	Unit       string      `json:"unit"`
	Conversion float64     `gorm:"type:decimal(14,4);default:1" json:"conversion"`
	UnitPrice  float64      `gorm:"type:decimal(14,4);default:0" json:"unitPrice"` // FIFO cost from seller at process time
	Discount   float64      `gorm:"type:decimal(5,2);default:0" json:"discount"`
	Notes      string       `json:"notes"`
}

func (RTUPurchaseItem) TableName() string { return "rtu_purchase_items" }

type AdditionalCost struct {
	Name   string  `json:"name"`
	Amount float64 `json:"amount"`
	Notes  string  `json:"notes"`
}
