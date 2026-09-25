package models

import (
	"time"

	"github.com/google/uuid"
)

type RTUVendor struct {
	ID              uuid.UUID           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	Code            string              `gorm:"uniqueIndex;not null" json:"code"`
	Name            string              `gorm:"not null" json:"name"`
	Category        string              `gorm:"default:'general'" json:"category"`
	Contacts        []VendorContact     `gorm:"type:jsonb;serializer:json;default:'[]'" json:"contacts"`
	Links           []VendorLink        `gorm:"type:jsonb;serializer:json;default:'[]'" json:"links"`
	Branches        []VendorBranch      `gorm:"type:jsonb;serializer:json;default:'[]'" json:"branches"`
	PaymentTermDays int                 `gorm:"default:30" json:"paymentTermDays"`
	IsActive        bool                `gorm:"default:true" json:"isActive"`
	Notes           *string             `json:"notes,omitempty"`
	BankAccounts    []VendorBankAccount `gorm:"type:jsonb;serializer:json;default:'[]'" json:"bankAccounts"`

	// Soft delete
	IsDeleted bool       `gorm:"default:false;index" json:"isDeleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	Creator   *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	Updater   *User      `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`

	Histories []RTUVendorHistory `gorm:"foreignKey:VendorID" json:"histories"`
}

type RTUVendorHistory struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	VendorID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"vendorId"`
	Action      string     `gorm:"type:varchar(50);not null" json:"action"` // CREATED, UPDATED, DELETED, RESTORED
	Changes     string     `gorm:"type:text" json:"changes"`
	PerformedBy *uuid.UUID `gorm:"type:uuid" json:"performedBy,omitempty"`
	Performer   *User      `gorm:"foreignKey:PerformedBy" json:"performer,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

func (RTUVendorHistory) TableName() string { return "rtu_vendor_histories" }

type VendorBankAccount struct {
	BankName      string `json:"bankName"`
	AccountNumber string `json:"accountNumber"`
	AccountHolder string `json:"accountHolder"`
	IsDefault     bool   `json:"isDefault"`
}

// VendorContact holds a single point-of-contact for a vendor (name, phone, and email unified).
type VendorContact struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
	Email string `json:"email"`
}

// VendorLink holds a social media / store link for a vendor.
// Type can be: "shopee", "instagram", "tokopedia", "website", "other".
type VendorLink struct {
	Type  string `json:"type"`
	URL   string `json:"url"`
	Label string `json:"label,omitempty"` // used when Type is "other"
}

func (RTUVendor) TableName() string { return "rtu_vendors" }

type VendorBranch struct {
	Name          string   `json:"name"`
	Address       string   `json:"address"`
	City          string   `json:"city"`
	Province      string   `json:"province"`
	Latitude      *float64 `json:"latitude,omitempty"`
	Longitude     *float64 `json:"longitude,omitempty"`
	GoogleMapsURL string   `json:"googleMapsUrl,omitempty"`
}
