package models

import (
	"time"

	"github.com/google/uuid"
)

type RTUMonthlyHPP struct {
	ID                 uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
        OutletID           uuid.UUID  `gorm:"type:uuid;not null;index:idx_rtu_hpp_outlet_month,unique" json:"outletId"`
        Outlet             *Outlet    `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
        MonthYear          string     `gorm:"type:varchar(7);not null;index:idx_rtu_hpp_outlet_month,unique" json:"monthYear"` // Format: YYYY-MM
	TotalMaterialCost  float64    `gorm:"type:decimal(16,4);not null;default:0" json:"totalMaterialCost"`
	TotalLaborCost     float64    `gorm:"type:decimal(16,4);not null;default:0" json:"totalLaborCost"`
	TotalOverheadCost  float64    `gorm:"type:decimal(16,4);not null;default:0" json:"totalOverheadCost"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
	CreatedBy          *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	UpdatedBy          *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	
	Creator            *User             `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater            *User             `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
	Histories          []RTUMonthlyHPPHistory `gorm:"foreignKey:MonthlyHPPID" json:"histories"`
}

type RTUMonthlyHPPHistory struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	MonthlyHPPID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"monthlyHppId"`
	Action            string     `gorm:"type:varchar(50);not null" json:"action"`
	TotalMaterialCost float64    `gorm:"type:decimal(16,4);not null" json:"totalMaterialCost"`
	TotalLaborCost    float64    `gorm:"type:decimal(16,4);not null" json:"totalLaborCost"`
	TotalOverheadCost float64    `gorm:"type:decimal(16,4);not null" json:"totalOverheadCost"`
	Notes             *string    `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt         time.Time  `json:"createdAt"`
	CreatedBy         *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`

	User              *User      `gorm:"foreignKey:CreatedBy" json:"user,omitempty"`
}

func (RTUMonthlyHPP) TableName() string { return "rtu_monthly_hpp" }

func (RTUMonthlyHPPHistory) TableName() string { return "rtu_monthly_hpp_histories" }
