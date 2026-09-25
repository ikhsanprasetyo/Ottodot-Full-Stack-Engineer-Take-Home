package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RTURecipe is the master entity coupling a product to its formulation versions
type RTURecipe struct {
	ID        uuid.UUID             `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"_id"`
	ProductID uuid.UUID             `gorm:"uniqueIndex;type:uuid;not null" json:"productId"`
	Versions  []RTURecipeVersion    `gorm:"foreignKey:RecipeID" json:"versions,omitempty"`
	CreatedAt time.Time             `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time             `gorm:"autoUpdateTime" json:"updatedAt"`
}

type RecipeVersionStatus string

const (
	RecipeStatusDraft    RecipeVersionStatus = "draft"
	RecipeStatusActive   RecipeVersionStatus = "active"
	RecipeStatusArchived RecipeVersionStatus = "archived" // locked, past versions
)

// RTURecipeVersion represents a specific immutable formulation of a recipe
type RTURecipeVersion struct {
	ID             uuid.UUID             `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"_id"`
	RecipeID       uuid.UUID             `gorm:"type:uuid;not null;index" json:"recipeId"`
	VersionNumber  string                `gorm:"not null" json:"versionNumber"` // e.g. "1.0", "1.1"
	Status         RecipeVersionStatus   `gorm:"type:varchar(20);default:'draft'" json:"status"`
	Notes          string                `json:"notes"`
	ExpectedOutput float64               `gorm:"not null" json:"expectedOutput"` // e.g. producing 5kg

	Ingredients    []RTURecipeIngredient `gorm:"foreignKey:VersionID" json:"ingredients,omitempty"`

	// Security locked: once a version is used in a ProdBatch, it cannot be edited
	IsLocked       bool                  `gorm:"default:false" json:"isLocked"`

	CreatedBy      *uuid.UUID            `gorm:"type:uuid" json:"createdBy,omitempty"`
	CreatedAt      time.Time             `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt      time.Time             `gorm:"autoUpdateTime" json:"updatedAt"`
}

// RTURecipeIngredient is a single component/material required in the specific version
type RTURecipeIngredient struct {
	ID         uuid.UUID    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"_id"`
	VersionID  uuid.UUID    `gorm:"type:uuid;not null;index" json:"versionId"`
	MaterialID             uuid.UUID    `gorm:"type:uuid;not null;index" json:"materialId"`
	AlternativeMaterialIDs []string     `gorm:"type:jsonb;serializer:json;default:'[]'" json:"alternativeMaterialIds"`
	Material               *RTUMaterial `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	Qty                    float64      `gorm:"not null" json:"qty"`   // Amount needed
	Unit                   string       `gorm:"not null" json:"unit"`  // Unit of the amount, ideally matching material minimum unit
}

func (m *RTURecipe) BeforeSave(tx *gorm.DB) (err error) { return nil }
func (m *RTURecipeVersion) BeforeSave(tx *gorm.DB) (err error) { return nil }
func (m *RTURecipeIngredient) BeforeSave(tx *gorm.DB) (err error) { return nil }
