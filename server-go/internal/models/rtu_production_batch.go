package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductionBatchStatus string

const (
	BatchStatusPlanned    ProductionBatchStatus = "planned"
	BatchStatusInProgress ProductionBatchStatus = "in_progress"
	BatchStatusCompleted  ProductionBatchStatus = "completed"
	BatchStatusCancelled  ProductionBatchStatus = "cancelled"
)

type RTUProductionBatch struct {
	ID              uuid.UUID             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	BatchNumber     string                `gorm:"uniqueIndex;not null" json:"batchNumber"` // e.g., PB-20260420-001
	OutletID        uuid.UUID             `gorm:"type:uuid;not null;index" json:"outletId"`
	Outlet          *Outlet               `gorm:"foreignKey:OutletID" json:"outlet,omitempty"`
	ProductID       uuid.UUID             `gorm:"type:uuid;not null;index" json:"productId"`
	Product         *RTUProduct           `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	RecipeVersionID uuid.UUID             `gorm:"type:uuid;not null;index" json:"recipeVersionId"`
	RecipeVersion   *RTURecipeVersion     `gorm:"foreignKey:RecipeVersionID" json:"recipeVersion,omitempty"`
	Status          ProductionBatchStatus `gorm:"type:varchar(20);default:'planned';not null" json:"status"`
	ActualQty       float64               `gorm:"type:decimal(14,3);not null" json:"actualQty"`
	PlannedDate     time.Time             `gorm:"not null" json:"plannedDate"`
	CompletedDate   *time.Time            `json:"completedDate,omitempty"`

	// Costing calculations
	TotalMaterialCost float64  `gorm:"type:decimal(14,4);default:0" json:"totalMaterialCost"`
	TotalLaborCost    float64  `gorm:"type:decimal(14,4);default:0" json:"totalLaborCost"`
	TotalOverheadCost float64  `gorm:"type:decimal(14,4);default:0" json:"totalOverheadCost"`
	TotalCost         float64  `gorm:"type:decimal(14,4);default:0" json:"totalCost"`
	UnitCost          *float64 `gorm:"type:decimal(14,4)" json:"unitCost,omitempty"`

	Notes *string `json:"notes,omitempty"`

	MaterialUsages []RTUMaterialUsage `gorm:"foreignKey:BatchID" json:"materialUsages"`
	LaborItems     []RTULaborItem     `gorm:"foreignKey:BatchID" json:"laborItems"`
	OverheadItems  []RTUOverheadItem  `gorm:"foreignKey:BatchID" json:"overheadItems"`

	IsDeleted bool       `gorm:"default:false;index" json:"isDeleted"`
	DeletedAt *time.Time `json:"deletedAt,omitempty"`
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"createdBy,omitempty"`
	Creator   *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updatedBy,omitempty"`
	Updater   *User      `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`

	Histories []RTUProductionBatchHistory `gorm:"foreignKey:BatchID" json:"histories"`
}

func (RTUProductionBatch) TableName() string { return "rtu_production_batches" }

type RTUProductionBatchHistory struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	BatchID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"batchId"`
	Action      string     `gorm:"type:varchar(50);not null" json:"action"`      // CREATED, UPDATED, COMPLETED, CANCELLED, DELETED
	Changes     string     `gorm:"type:text" json:"changes"`                     // Description of what changed
	PerformedBy *uuid.UUID `gorm:"type:uuid" json:"performedBy,omitempty"`
	Performer   *User      `gorm:"foreignKey:PerformedBy" json:"performer,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}

func (RTUProductionBatchHistory) TableName() string { return "rtu_production_batch_histories" }

type RTUMaterialUsage struct {
	ID                 uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	BatchID            uuid.UUID    `gorm:"type:uuid;not null;index" json:"batchId"`
	RecipeIngredientID *uuid.UUID   `gorm:"type:uuid;index" json:"recipeIngredientId,omitempty"`
	MaterialID         uuid.UUID    `gorm:"type:uuid;not null;index" json:"materialId"`
	Material           *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	PlannedQty         float64      `gorm:"type:decimal(14,3);not null" json:"plannedQty"`
	ActualQty  float64      `gorm:"type:decimal(14,3);not null" json:"actualQty"`
	Unit       string       `gorm:"not null" json:"unit"`
	UnitCost   float64      `gorm:"type:decimal(14,4);not null" json:"unitCost"` // Copied from material.CurrentPrice
	TotalCost  float64      `gorm:"type:decimal(14,4);not null" json:"totalCost"`
}

func (RTUMaterialUsage) TableName() string { return "rtu_material_usages" }

type RTULaborItem struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	BatchID     uuid.UUID `gorm:"type:uuid;not null;index" json:"batchId"`
	Description string    `gorm:"not null" json:"description"`
	WorkerCount int       `gorm:"default:1" json:"workerCount"`
	HoursWorked float64   `gorm:"type:decimal(8,2)" json:"hoursWorked"`
	RatePerHour float64   `gorm:"type:decimal(14,4)" json:"ratePerHour"`
	TotalCost   float64   `gorm:"type:decimal(14,4);not null" json:"totalCost"` // workerCount * hoursWorked * ratePerHour
}

func (RTULaborItem) TableName() string { return "rtu_labor_items" }

type RTUOverheadItem struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"_id"`
	BatchID     uuid.UUID `gorm:"type:uuid;not null;index" json:"batchId"`
	Description string    `gorm:"not null" json:"description"` // e.g. Gas, Listrik
	Cost        float64   `gorm:"type:decimal(14,4);not null" json:"cost"`
}

func (RTUOverheadItem) TableName() string { return "rtu_overhead_items" }

func (m *RTUProductionBatch) BeforeCreate(tx *gorm.DB) (err error) {
	if m.BatchNumber == "" {
		var abbrev string
		if m.OutletID != uuid.Nil {
			var outlet Outlet
			if err := tx.Select("abbreviation").First(&outlet, "id = ?", m.OutletID).Error; err == nil {
				if outlet.Abbreviation != nil && *outlet.Abbreviation != "" {
					abbrev = *outlet.Abbreviation
				}
			}
		}
		prefix := "PB-"
		if abbrev != "" {
			prefix = fmt.Sprintf("PB-%s-", abbrev)
		}
		dateStr := time.Now().Format("20060102")
		if !m.PlannedDate.IsZero() {
			dateStr = m.PlannedDate.Format("20060102")
		}
		m.BatchNumber = fmt.Sprintf("%s%s-%s", prefix, dateStr, uuid.New().String()[:8])
	}
	return nil
}
