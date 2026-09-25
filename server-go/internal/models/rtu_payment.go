package models

import (
	"time"

	"github.com/google/uuid"
)

type PaymentStatus string

const (
	PaymentStatusDraft     PaymentStatus = "DRAFT"
	PaymentStatusCompleted PaymentStatus = "COMPLETED"
	PaymentStatusCancelled PaymentStatus = "CANCELLED"
)

type PaymentMethod string

const (
	PaymentMethodCash     PaymentMethod = "CASH"
	PaymentMethodTransfer PaymentMethod = "TRANSFER"
	PaymentMethodGiro     PaymentMethod = "GIRO"
)

// RTUPayment represents a bulk payment transaction
type RTUPayment struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	DocNumber   string         `gorm:"uniqueIndex;not null" json:"docNumber"`
	BuyerID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"buyerId"` // Outlet that pays
	Buyer       *Outlet        `gorm:"foreignKey:BuyerID" json:"buyer,omitempty"`
	SellerID    *uuid.UUID     `gorm:"type:uuid;index" json:"sellerId,omitempty"` // Internal seller
	Seller      *Outlet        `gorm:"foreignKey:SellerID" json:"seller,omitempty"`
	VendorID    *uuid.UUID     `gorm:"type:uuid;index" json:"vendorId,omitempty"` // External vendor
	Vendor      *RTUVendor     `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	PaymentDate time.Time      `gorm:"not null" json:"paymentDate"`
	Amount      float64        `gorm:"type:decimal(14,2);not null;default:0" json:"amount"`
	TaxPercent  float64        `gorm:"type:decimal(5,2);default:0" json:"taxPercent"`
	Method      PaymentMethod  `gorm:"type:varchar(20);not null;default:'CASH'" json:"method"`
	Status      PaymentStatus  `gorm:"type:varchar(20);default:'DRAFT'" json:"status"`
	BankName    string         `json:"bankName"`
	BankAccount string         `json:"bankAccount"`
	Notes       string         `json:"notes"`

	Details []RTUPaymentDetail `gorm:"foreignKey:PaymentID" json:"details"`

	IsDeleted bool       `gorm:"default:false" json:"isDeleted"`
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`

	Creator *User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater *User `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`

	Histories []RTUPaymentHistory `gorm:"foreignKey:PaymentID" json:"histories"`
}

func (RTUPayment) TableName() string { return "rtu_payments" }

type RTUPaymentHistory struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	PaymentID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"paymentId"`
	Action      string     `gorm:"type:varchar(50);not null" json:"action"`
	Changes     string     `gorm:"type:text" json:"changes"`
	PerformedBy *uuid.UUID `gorm:"type:uuid" json:"performedBy,omitempty"`
	Performer   *User      `gorm:"foreignKey:PerformedBy" json:"performer,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

func (RTUPaymentHistory) TableName() string { return "rtu_payment_histories" }

// RTUPaymentDetail maps the payment allocation to specific purchases/invoices
type RTUPaymentDetail struct {
	ID            uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	PaymentID     uuid.UUID    `gorm:"type:uuid;not null;index" json:"paymentId"`
	PurchaseID    uuid.UUID    `gorm:"type:uuid;not null;index" json:"purchaseId"`
	Purchase      *RTUPurchase `gorm:"foreignKey:PurchaseID" json:"purchase,omitempty"`
	AmountApplied float64      `gorm:"type:decimal(14,2);not null;default:0" json:"amountApplied"`
	Notes         string       `json:"notes"`
}

func (RTUPaymentDetail) TableName() string { return "rtu_payment_details" }
