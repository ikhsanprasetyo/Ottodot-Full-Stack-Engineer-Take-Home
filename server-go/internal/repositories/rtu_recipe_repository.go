package repositories

import (
	"context"

	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTURecipeRepository interface {
	GetRecipeByProductID(ctx context.Context, productID string) (*models.RTURecipe, error)
	CreateRecipe(ctx context.Context, recipe *models.RTURecipe) error
	
	// Version specific functions
	GetVersionsByRecipeID(ctx context.Context, recipeID string) ([]*models.RTURecipeVersion, error)
	GetVersionByID(ctx context.Context, versionID string) (*models.RTURecipeVersion, error)
	CreateVersion(ctx context.Context, version *models.RTURecipeVersion) error
	ActivateVersion(ctx context.Context, recipeID string, versionID string) error
	DeleteDraftVersion(ctx context.Context, versionID string) error
}

type rtuRecipeRepository struct {
	db *gorm.DB
}

func NewRTURecipeRepository(db *gorm.DB) RTURecipeRepository {
	return &rtuRecipeRepository{db: db}
}

func (r *rtuRecipeRepository) GetRecipeByProductID(ctx context.Context, productID string) (*models.RTURecipe, error) {
	var recipe models.RTURecipe
	err := r.db.WithContext(ctx).
		Preload("Versions").
		Preload("Versions.Ingredients").
		Preload("Versions.Ingredients.Material").
		Where("product_id = ?", productID).
		First(&recipe).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // return nil safely if no recipe exists yet
		}
		return nil, err
	}
	return &recipe, nil
}

func (r *rtuRecipeRepository) CreateRecipe(ctx context.Context, recipe *models.RTURecipe) error {
	return r.db.WithContext(ctx).Create(recipe).Error
}

func (r *rtuRecipeRepository) GetVersionsByRecipeID(ctx context.Context, recipeID string) ([]*models.RTURecipeVersion, error) {
	var versions []*models.RTURecipeVersion
	err := r.db.WithContext(ctx).
		Preload("Ingredients.Material").
		Where("recipe_id = ?", recipeID).
		Order("created_at desc").
		Find(&versions).Error
	return versions, err
}

func (r *rtuRecipeRepository) GetVersionByID(ctx context.Context, versionID string) (*models.RTURecipeVersion, error) {
	var version models.RTURecipeVersion
	err := r.db.WithContext(ctx).
		Preload("Ingredients.Material").
		Where("id = ?", versionID).
		First(&version).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &version, nil
}

func (r *rtuRecipeRepository) CreateVersion(ctx context.Context, version *models.RTURecipeVersion) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Just create the nested struct (gorm handles association inserts automatically if properly structured)
		if err := tx.Create(version).Error; err != nil {
			return err
		}
		return nil
	})
}

// ActivateVersion performs a complex transaction: finding the previous 'active' version for the Recipe
// and archiving it, then promoting the target version to 'active'
func (r *rtuRecipeRepository) ActivateVersion(ctx context.Context, recipeID string, versionID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Archive all currently active versions for this recipe
		if err := tx.Model(&models.RTURecipeVersion{}).
			Where("recipe_id = ? AND status = ?", recipeID, models.RecipeStatusActive).
			Update("status", models.RecipeStatusArchived).Error; err != nil {
			return err
		}

		// Activate the selected version
		if err := tx.Model(&models.RTURecipeVersion{}).
			Where("id = ?", versionID).
			Update("status", models.RecipeStatusActive).Error; err != nil {
			return err
		}

		return nil
	})
}

func (r *rtuRecipeRepository) DeleteDraftVersion(ctx context.Context, versionID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var version models.RTURecipeVersion
		if err := tx.First(&version, "id = ?", versionID).Error; err != nil {
			return err
		}
		if version.Status != models.RecipeStatusDraft {
			return gorm.ErrInvalidData // only drafts can be deleted completely
		}
		
		// Delete ingredients first
		if err := tx.Where("version_id = ?", versionID).Delete(&models.RTURecipeIngredient{}).Error; err != nil {
			return err
		}
		// Delete version
		if err := tx.Delete(&version).Error; err != nil {
			return err
		}
		
		return nil
	})
}
