package models

import (
	"time"

	"github.com/google/uuid"
)

type RTUUnit struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	Name      string     `gorm:"uniqueIndex;not null" json:"name"`
	// Level menentukan hierarki satuan:
	//   0 = Satuan Dasar (ml, gr, L, kg)
	//   1 = Satuan Individual (pcs, botol, sachet, jerigen)
	//   2 = Satuan Bundel (Dus, Box, Karton)
	//   3 = Satuan Besar (Container, Pallet, Truk)
	Level     int        `gorm:"default:1;not null" json:"level"`
	IsActive  bool       `gorm:"default:true" json:"isActive"`
	IsDeleted bool       `gorm:"default:false;index" json:"isDeleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

func (RTUUnit) TableName() string { return "rtu_units" }
