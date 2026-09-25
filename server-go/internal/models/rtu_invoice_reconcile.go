package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RTUInvoiceReconcile represents a vendor invoice financial document (AP Invoice).
// This is separate from RTUGRN (goods receipt) to follow the global ERP Three-Way Match pattern:
//   PO (Purchase Order) → GRN (Goods Receipt) → Invoice Reconcile (Vendor Invoice / AP Invoice)
type RTUInvoiceReconcile struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	InvoiceNumber string     `gorm:"uniqueIndex;not null" json:"invoiceNumber"` // e.g., INV-20260813-xxxx
	PurchaseID    *uuid.UUID `gorm:"type:uuid;index" json:"purchaseId,omitempty"`
	Purchase      *RTUPurchase `gorm:"foreignKey:PurchaseID" json:"purchase,omitempty"`
	VendorID      *uuid.UUID `gorm:"type:uuid;index" json:"vendorId,omitempty"`
	Vendor        *RTUVendor `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	OutletID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"outletId"`
	Outlet        *Outlet    `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`

	Status      string    `gorm:"type:varchar(20);default:'DRAFT';not null" json:"status"` // DRAFT, CONFIRMED, CANCELLED
	InvoiceDate time.Time `gorm:"not null" json:"invoiceDate"`
	TaxPercent  float64   `gorm:"type:decimal(5,2);default:0" json:"taxPercent"`
	ShippingFee  float64   `gorm:"type:decimal(14,2);default:0" json:"shippingFee"`
	LoadingFee   float64   `gorm:"type:decimal(14,2);default:0" json:"loadingFee"`
	UnloadingFee float64   `gorm:"type:decimal(14,2);default:0" json:"unloadingFee"`
	AdditionalCosts []AdditionalCost `gorm:"type:jsonb;serializer:json;default:'[]'" json:"additionalCosts"`
	Notes       string    `gorm:"type:text" json:"notes"`
	TotalAmount float64   `gorm:"type:decimal(14,4);default:0" json:"totalAmount"`

	// Items: one row per material being invoiced
	Items []RTUInvoiceReconcileItem `gorm:"foreignKey:InvoiceID" json:"items"`

	// GRNs linked to this invoice (Many-to-Many via pivot table)
	GRNs []RTUGRN `gorm:"many2many:rtu_invoice_reconcile_grns;joinForeignKey:InvoiceID;joinReferences:GRNID" json:"grns,omitempty"`

	IsDeleted bool       `gorm:"default:false;index" json:"isDeleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`

	Creator  *User                   `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater  *User                   `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
	Histories []RTUInvoiceReconcileHistory `gorm:"foreignKey:InvoiceID" json:"histories"`
}

func (RTUInvoiceReconcile) TableName() string { return "rtu_invoice_reconciles" }

func (m *RTUInvoiceReconcile) BeforeCreate(tx *gorm.DB) (err error) {
	if m.InvoiceNumber == "" {
		var abbrev string
		if m.OutletID != uuid.Nil {
			var outlet Outlet
			if err := tx.Select("abbreviation").First(&outlet, "id = ?", m.OutletID).Error; err == nil {
				if outlet.Abbreviation != nil && *outlet.Abbreviation != "" {
					abbrev = *outlet.Abbreviation
				}
			}
		}
		prefix := "INV-"
		if abbrev != "" {
			prefix = fmt.Sprintf("INV-%s-", abbrev)
		}
		dateStr := time.Now().Format("20060102")
		if !m.InvoiceDate.IsZero() {
			dateStr = m.InvoiceDate.Format("20060102")
		}
		m.InvoiceNumber = fmt.Sprintf("%s%s-%s", prefix, dateStr, uuid.New().String()[:8])
	}
	return nil
}

// RTUInvoiceReconcileItem is one line of the vendor invoice per material.
type RTUInvoiceReconcileItem struct {
	ID          uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	InvoiceID   uuid.UUID    `gorm:"type:uuid;not null;index" json:"invoiceId"`
	MaterialID  uuid.UUID    `gorm:"type:uuid;not null;index" json:"materialId"`
	Material    *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	QtyInvoiced float64      `gorm:"type:decimal(14,3);not null" json:"qtyInvoiced"` // Qty billed in vendor invoice
	Unit        string       `gorm:"not null" json:"unit"`
	UnitPrice   float64      `gorm:"type:decimal(14,4);not null" json:"unitPrice"` // Agreed unit price at reconciliation
	Discount    float64      `gorm:"type:decimal(5,2);default:0" json:"discount"`
	Subtotal    float64      `gorm:"type:decimal(14,4);not null" json:"subtotal"`
}

func (RTUInvoiceReconcileItem) TableName() string { return "rtu_invoice_reconcile_items" }

// RTUInvoiceReconcileHistory records every action on an Invoice for full auditability.
type RTUInvoiceReconcileHistory struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	InvoiceID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"invoiceId"`
	Action      string     `gorm:"type:varchar(50);not null" json:"action"`
	Changes     string     `gorm:"type:text" json:"changes"`
	PerformedBy *uuid.UUID `gorm:"type:uuid" json:"performedBy,omitempty"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"createdAt"`

	Performer *User `gorm:"foreignKey:PerformedBy" json:"performer,omitempty"`
}

func (RTUInvoiceReconcileHistory) TableName() string { return "rtu_invoice_reconcile_histories" }
