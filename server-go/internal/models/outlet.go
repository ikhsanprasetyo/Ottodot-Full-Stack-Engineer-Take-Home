package models

import (
	"time"

	"github.com/google/uuid"
)

type Outlet struct {
	ID    uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	Name  string    `gorm:"not null"  json:"name"`
	Label string    `gorm:"not null;uniqueIndex" json:"label"`
	Type  string    `gorm:"not null"  json:"type"`

	// Address
	Address     *string `json:"address,omitempty"`
	SubDistrict *string `json:"subDistrict,omitempty"`
	District    *string `json:"district,omitempty"`
	City        *string `json:"city,omitempty"`
	Region      *string `json:"region,omitempty"`
	State       *string `json:"state,omitempty"`

	// Employee stats
	TotalEmployees          *int `json:"totalEmployees,omitempty"`
	TotalPermanentEmployees *int `json:"totalPermanentEmployees,omitempty"`
	TotalProbationEmployees *int `json:"totalProbationEmployees,omitempty"`
	TotalMen                *int `json:"totalMen,omitempty"`
	TotalWomen              *int `json:"totalWomen,omitempty"`
	TotalShiftPerDay        int  `gorm:"default:3" json:"totalShiftPerDay"`

	Abbreviation *string    `json:"abbreviation,omitempty"`
	DateFound    *time.Time `json:"dateFound,omitempty"`
	Image        *string    `json:"image,omitempty"`

	// Soft delete
	IsDeleted bool       `gorm:"default:false;index" json:"isDeleted"`
	DeletedAt *time.Time `                           json:"deletedAt,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid"           json:"updatedBy,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (Outlet) TableName() string { return "outlets" }
