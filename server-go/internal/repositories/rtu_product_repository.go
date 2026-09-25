package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUProductRepository interface {
	Create(ctx context.Context, product *models.RTUProduct) error
	FindByID(ctx context.Context, id string) (*models.RTUProduct, error)
	FindByIDUnscoped(ctx context.Context, id string) (*models.RTUProduct, error)
	FindAll(ctx context.Context, search string, isActive *bool, outletID *uuid.UUID, category string, showDeleted bool) ([]*models.RTUProduct, error)
	Update(ctx context.Context, product *models.RTUProduct) error
	Delete(ctx context.Context, id string, deletedBy uuid.UUID) error
	Restore(ctx context.Context, id string, restoredBy *uuid.UUID) error
	HardDelete(ctx context.Context, id string) error
}

type rtuProductRepository struct {
	db *gorm.DB
}

func NewRTUProductRepository(db *gorm.DB) RTUProductRepository {
	return &rtuProductRepository{db: db}
}

func (r *rtuProductRepository) Create(ctx context.Context, product *models.RTUProduct) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if product.ID == uuid.Nil {
			product.ID = uuid.New()
		}
		if err := tx.Create(product).Error; err != nil {
			return err
		}
		history := models.RTUProductHistory{
			ID:          uuid.New(),
			ProductID:   product.ID,
			Action:      "CREATED",
			Changes:     "Produk " + product.Name + " (" + product.Code + ") dibuat",
			PerformedBy: product.CreatedBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuProductRepository) FindByID(ctx context.Context, id string) (*models.RTUProduct, error) {
	var product models.RTUProduct
	err := r.db.WithContext(ctx).
		Preload("Recipe").
		Preload("Units").
		Preload("Creator").
		Preload("Creator.Position").
		Preload("Updater").
		Preload("Updater.Position").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Preload("Histories.Performer.Position").
		Preload("Recipe.Versions", "status = ?", models.RecipeStatusActive).
		Preload("Recipe.Versions.Ingredients").
		Preload("Recipe.Versions.Ingredients.Material").
		Where("id = ? AND is_deleted = ?", id, false).
		First(&product).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

func (r *rtuProductRepository) FindAll(ctx context.Context, search string, isActive *bool, outletID *uuid.UUID, category string, showDeleted bool) ([]*models.RTUProduct, error) {
	var products []*models.RTUProduct
	query := r.db.WithContext(ctx).
		Preload("Units").
		Preload("Creator").
		Preload("Creator.Position").
		Preload("Updater").
		Preload("Updater.Position").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Preload("Histories.Performer.Position").
		Where("rtu_products.is_deleted = ?", showDeleted)

	if outletID != nil {
		query = query.Joins("LEFT JOIN rtu_outlet_product_stocks ON rtu_outlet_product_stocks.product_id = rtu_products.id AND rtu_outlet_product_stocks.outlet_id = ?", *outletID).
			Select("rtu_products.*, COALESCE(rtu_outlet_product_stocks.current_stock, 0) as current_stock, COALESCE(NULLIF(rtu_outlet_product_stocks.current_price, 0), rtu_products.current_price) as current_price")
	}

	if search != "" {
		searchLower := strings.ToLower(search)
		query = query.Where("LOWER(rtu_products.code) LIKE ? OR LOWER(rtu_products.name) LIKE ?", "%"+searchLower+"%", "%"+searchLower+"%")
	}

	if isActive != nil {
		query = query.Where("rtu_products.is_active = ?", *isActive)
	}

	if category != "" {
		query = query.Where("rtu_products.category = ?", category)
	}

	err := query.Order("rtu_products.code asc").
		Preload("Recipe").
		Preload("Recipe.Versions").
		Preload("Recipe.Versions.Ingredients").
		Preload("Recipe.Versions.Ingredients.Material").
		Find(&products).Error
	return products, err
}

func (r *rtuProductRepository) Update(ctx context.Context, product *models.RTUProduct) error {
	var oldProduct models.RTUProduct
	if err := r.db.WithContext(ctx).Where("id = ?", product.ID).First(&oldProduct).Error; err == nil {
		oldUnit := strings.ToLower(strings.TrimSpace(oldProduct.OutputUnit))
		newUnit := strings.ToLower(strings.TrimSpace(product.OutputUnit))

		if oldUnit != "" && newUnit != "" && oldUnit != newUnit {
			var factor float64 = 1.0
			isConversionSupported := false

			if (oldUnit == "gr" || oldUnit == "g") && (newUnit == "kg") {
				factor = 0.001
				isConversionSupported = true
			} else if (oldUnit == "kg") && (newUnit == "gr" || newUnit == "g") {
				factor = 1000.0
				isConversionSupported = true
			}

			if isConversionSupported {
				return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
					// 1. Update current stock in memory before saving
					product.CurrentStock = product.CurrentStock * factor

					// 2. Update current stock in rtu_outlet_product_stocks
					if err := tx.Model(&models.RTUOutletProductStock{}).
						Where("product_id = ?", product.ID).
						UpdateColumn("current_stock", gorm.Expr("current_stock * ?", factor)).Error; err != nil {
						return err
					}

					// 3. Update qty and unit in rtu_distribution_items
					if err := tx.Model(&models.RTUDistributionItem{}).
						Where("product_id = ?", product.ID).
						Updates(map[string]interface{}{
							"qty":  gorm.Expr("qty * ?", factor),
							"unit": product.OutputUnit,
						}).Error; err != nil {
						return err
					}

					// 4. Update target_qty and actual_qty in rtu_production_batches
					if err := tx.Model(&models.RTUProductionBatch{}).
						Where("product_id = ?", product.ID).
						Updates(map[string]interface{}{
							"target_qty": gorm.Expr("target_qty * ?", factor),
							"actual_qty": gorm.Expr("actual_qty * ?", factor),
						}).Error; err != nil {
						return err
					}

					// 5. Update expected_output in rtu_recipe_versions
					if err := tx.Exec(`
						UPDATE rtu_recipe_versions 
						SET expected_output = expected_output * ? 
						WHERE recipe_id IN (SELECT id FROM rtu_recipes WHERE product_id = ?)`,
						factor, product.ID).Error; err != nil {
						return err
					}

					// Delete existing units first to prevent duplication
					if err := tx.Where("product_id = ?", product.ID).Delete(&models.RTUProductUnit{}).Error; err != nil {
						return err
					}
					// 6. Save the product itself (will update output_unit and current_stock)
					errSave := tx.Save(product).Error
					if errSave == nil && product.Units != nil {
						tx.Model(product).Association("Units").Replace(product.Units)
					}
					if errSave == nil {
						history := models.RTUProductHistory{
							ID:          uuid.New(),
							ProductID:   product.ID,
							Action:      "UPDATED",
							Changes:     compareProductChanges(&oldProduct, product),
							PerformedBy: product.UpdatedBy,
							CreatedAt:   time.Now(),
						}
						tx.Create(&history)
					}
					return errSave
				})
			}
		}
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete existing units first to prevent duplication
		if err := tx.Where("product_id = ?", product.ID).Delete(&models.RTUProductUnit{}).Error; err != nil {
			return err
		}
		errSave := tx.Save(product).Error
		if errSave == nil && product.Units != nil {
			tx.Model(product).Association("Units").Replace(product.Units)
		}
		if errSave == nil {
			history := models.RTUProductHistory{
				ID:          uuid.New(),
				ProductID:   product.ID,
				Action:      "UPDATED",
				Changes:     compareProductChanges(&oldProduct, product),
				PerformedBy: product.UpdatedBy,
				CreatedAt:   time.Now(),
			}
			tx.Create(&history)
		}
		return errSave
	})
}

func (r *rtuProductRepository) Delete(ctx context.Context, id string, deletedBy uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		parsedID, _ := uuid.Parse(id)
		if err := tx.Model(&models.RTUProduct{}).Where("id = ?", id).
			Updates(map[string]interface{}{"is_deleted": true, "updated_by": deletedBy, "deleted_at": gorm.Expr("NOW()")}).Error; err != nil {
			return err
		}
		history := models.RTUProductHistory{
			ID:          uuid.New(),
			ProductID:   parsedID,
			Action:      "DELETED",
			Changes:     "Produk dipindahkan ke Recycle Bin",
			PerformedBy: &deletedBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuProductRepository) Restore(ctx context.Context, id string, restoredBy *uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		parsedID, _ := uuid.Parse(id)
		if err := tx.Model(&models.RTUProduct{}).Where("id = ?", id).
			Updates(map[string]interface{}{"is_deleted": false, "deleted_at": nil}).Error; err != nil {
			return err
		}
		history := models.RTUProductHistory{
			ID:          uuid.New(),
			ProductID:   parsedID,
			Action:      "RESTORED",
			Changes:     "Produk dipulihkan dari Recycle Bin",
			PerformedBy: restoredBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuProductRepository) FindByIDUnscoped(ctx context.Context, id string) (*models.RTUProduct, error) {
	var product models.RTUProduct
	err := r.db.WithContext(ctx).
		Preload("Units").
		Preload("Creator").
		Preload("Creator.Position").
		Preload("Updater").
		Preload("Updater.Position").
		Preload("Histories", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		Preload("Histories.Performer").
		Preload("Histories.Performer.Position").
		Where("id = ?", id).
		First(&product).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

func (r *rtuProductRepository) HardDelete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Delete associated product units
		if err := tx.Where("product_id = ?", id).Delete(&models.RTUProductUnit{}).Error; err != nil {
			return err
		}
		// 2. Delete the product itself
		if err := tx.Unscoped().Where("id = ?", id).Delete(&models.RTUProduct{}).Error; err != nil {
			return err
		}
		return nil
	})
}
