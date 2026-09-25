package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

type RTUMaterialRepository interface {
	Create(ctx context.Context, material *models.RTUMaterial) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.RTUMaterial, error)
	FindByIDUnscoped(ctx context.Context, id uuid.UUID) (*models.RTUMaterial, error)
	FindAll(ctx context.Context, search string, isActive *bool, vendorID *uuid.UUID, outletID *uuid.UUID, category string, showDeleted bool) ([]models.RTUMaterial, error)
	Update(ctx context.Context, material *models.RTUMaterial) error
	Delete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error
	Restore(ctx context.Context, id uuid.UUID, restoredBy *uuid.UUID) error
	HardDelete(ctx context.Context, id uuid.UUID) error

	AddPriceHistory(ctx context.Context, history *models.RTUMaterialPriceHistory) error
	GetPriceHistory(ctx context.Context, materialID uuid.UUID, outletID *uuid.UUID) ([]models.RTUMaterialPriceHistory, error)

	AddLedgerEntry(ctx context.Context, entry *models.RTUStockLedger) error
	GetStockLedger(ctx context.Context, materialID uuid.UUID) ([]models.RTUStockLedger, error)

	WithTransaction(tx *gorm.DB) RTUMaterialRepository

	SetOutletVendor(ctx context.Context, mapping *models.RTUOutletMaterialVendor) error
	GetOutletVendor(ctx context.Context, materialID uuid.UUID, outletID uuid.UUID) (*models.RTUOutletMaterialVendor, error)
}

type rtuMaterialRepository struct {
	db *gorm.DB
}

func NewRTUMaterialRepository(db *gorm.DB) RTUMaterialRepository {
	return &rtuMaterialRepository{db}
}

func (r *rtuMaterialRepository) Create(ctx context.Context, material *models.RTUMaterial) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if material.ID == uuid.Nil {
			material.ID = uuid.New()
		}
		if err := tx.Create(material).Error; err != nil {
			return err
		}
		history := models.RTUMaterialHistory{
			ID:          uuid.New(),
			MaterialID:  material.ID,
			Action:      "CREATED",
			Changes:     "Bahan baku " + material.Name + " (" + material.Code + ") dibuat",
			PerformedBy: material.CreatedBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuMaterialRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.RTUMaterial, error) {
	var material models.RTUMaterial
	err := r.db.WithContext(ctx).
		Preload("Vendor").
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
		Where("id = ? AND is_deleted = ?", id, false).First(&material).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Return nil if not found
		}
		return nil, err
	}
	return &material, nil
}

func (r *rtuMaterialRepository) FindByIDUnscoped(ctx context.Context, id uuid.UUID) (*models.RTUMaterial, error) {
	var material models.RTUMaterial
	err := r.db.WithContext(ctx).
		Preload("Vendor").
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
		Where("id = ?", id).First(&material).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &material, nil
}

func (r *rtuMaterialRepository) FindAll(ctx context.Context, search string, isActive *bool, vendorID *uuid.UUID, outletID *uuid.UUID, category string, showDeleted bool) ([]models.RTUMaterial, error) {
	var materials []models.RTUMaterial
	query := r.db.WithContext(ctx).
		Preload("Vendor").
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
		Where("rtu_materials.is_deleted = ?", showDeleted)

	if category != "" {
		query = query.Where("rtu_materials.category = ?", category)
	}

	if outletID != nil {
		// Join with outlet stocks and select the specific outlet's current stock as virtual field
		// We'll update the CurrentStock field in the model temporarily or a separate field
		query = query.Joins("LEFT JOIN rtu_outlet_material_stocks ON rtu_outlet_material_stocks.material_id = rtu_materials.id AND rtu_outlet_material_stocks.outlet_id = ?", *outletID).
			Select("rtu_materials.*, COALESCE(rtu_outlet_material_stocks.current_stock, 0) as current_stock, COALESCE(NULLIF(rtu_outlet_material_stocks.current_price, 0), rtu_materials.current_price) as current_price")
	}

	if search != "" {
		query = query.Where("rtu_materials.name ILIKE ? OR rtu_materials.code ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if isActive != nil {
		query = query.Where("rtu_materials.is_active = ?", *isActive)
	}
	
	if vendorID != nil {
		query = query.Where("rtu_materials.vendor_id = ?", *vendorID)
	}

	err := query.Order("rtu_materials.name ASC").Find(&materials).Error
	return materials, err
}

func (r *rtuMaterialRepository) Update(ctx context.Context, material *models.RTUMaterial) error {
	var old models.RTUMaterial
	err := r.db.WithContext(ctx).Where("id = ?", material.ID).First(&old).Error
	if err != nil {
		// If old record is not found, just perform normal save
		return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			errSave := tx.Save(material).Error
			if errSave == nil && material.Units != nil {
				tx.Model(material).Association("Units").Replace(material.Units)
			}
			if errSave == nil {
				history := models.RTUMaterialHistory{
					ID:          uuid.New(),
					MaterialID:  material.ID,
					Action:      "UPDATED",
					Changes:     compareMaterialChanges(&old, material),
					PerformedBy: material.UpdatedBy,
					CreatedAt:   time.Now(),
				}
				tx.Create(&history)
			}
			return errSave
		})
	}

	if old.Unit != material.Unit {
		var qtyFactor float64 = 1.0
		var priceFactor float64 = 1.0
		hasScaling := false

		oldUnit := old.Unit
		newUnit := material.Unit

		// gr <-> kg
		if (oldUnit == "gr" || oldUnit == "GR" || oldUnit == "gram" || oldUnit == "Gram") && (newUnit == "kg" || newUnit == "KG") {
			qtyFactor = 0.001
			priceFactor = 1000.0
			hasScaling = true
		} else if (oldUnit == "kg" || oldUnit == "KG") && (newUnit == "gr" || newUnit == "GR" || oldUnit == "gram" || oldUnit == "Gram") {
			qtyFactor = 1000.0
			priceFactor = 0.001
			hasScaling = true
		}

		// ml <-> L
		if (oldUnit == "ml" || oldUnit == "ML") && (newUnit == "L" || newUnit == "l") {
			qtyFactor = 0.001
			priceFactor = 1000.0
			hasScaling = true
		} else if (oldUnit == "L" || oldUnit == "l") && (newUnit == "ml" || oldUnit == "ML") {
			qtyFactor = 1000.0
			priceFactor = 0.001
			hasScaling = true
		}

		return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if hasScaling {
				// 1. Scale existing material stock and price fields before saving
				material.CurrentStock = material.CurrentStock * qtyFactor
				material.MinStock = material.MinStock * qtyFactor
				material.CurrentPrice = material.CurrentPrice * priceFactor

				// 2. Update all outlet material stocks
				if err := tx.Exec("UPDATE rtu_outlet_material_stocks SET current_stock = current_stock * ?, min_stock = min_stock * ? WHERE material_id = ?", qtyFactor, qtyFactor, material.ID).Error; err != nil {
					return err
				}

				// 3. Update stock ledgers
				if err := tx.Exec("UPDATE rtu_stock_ledgers SET qty = qty * ?, balance_after = balance_after * ?, unit = ? WHERE material_id = ?", qtyFactor, qtyFactor, newUnit, material.ID).Error; err != nil {
					return err
				}

				// 4. Update material price histories
				if err := tx.Exec("UPDATE rtu_material_price_histories SET price = price * ? WHERE material_id = ?", priceFactor, material.ID).Error; err != nil {
					return err
				}

				// 5. Update GRN items
				if err := tx.Exec("UPDATE rtu_grn_items SET qty_received = qty_received * ?, unit = ?, unit_price = unit_price * ? WHERE material_id = ?", qtyFactor, newUnit, priceFactor, material.ID).Error; err != nil {
					return err
				}

				// 6. Update recipe ingredients
				if err := tx.Exec("UPDATE rtu_recipe_ingredients SET qty = qty * ?, unit = ? WHERE material_id = ?", qtyFactor, newUnit, material.ID).Error; err != nil {
					return err
				}
			} else {
				// If no standard conversion is recognized, just update unit strings to avoid inconsistency
				if err := tx.Exec("UPDATE rtu_stock_ledgers SET unit = ? WHERE material_id = ?", newUnit, material.ID).Error; err != nil {
					return err
				}
				if err := tx.Exec("UPDATE rtu_grn_items SET unit = ? WHERE material_id = ?", newUnit, material.ID).Error; err != nil {
					return err
				}
				if err := tx.Exec("UPDATE rtu_recipe_ingredients SET unit = ? WHERE material_id = ?", newUnit, material.ID).Error; err != nil {
					return err
				}
			}

			// Delete existing units first to prevent duplication
			if err := tx.Where("material_id = ?", material.ID).Delete(&models.RTUMaterialUnit{}).Error; err != nil {
				return err
			}
			// Save the main material record
			errSave := tx.Save(material).Error
			if errSave == nil && material.Units != nil {
				tx.Model(material).Association("Units").Replace(material.Units)
			}
			if errSave == nil {
				history := models.RTUMaterialHistory{
					ID:          uuid.New(),
					MaterialID:  material.ID,
					Action:      "UPDATED",
					Changes:     compareMaterialChanges(&old, material),
					PerformedBy: material.UpdatedBy,
					CreatedAt:   time.Now(),
				}
				tx.Create(&history)
			}
			return errSave
		})
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete existing units first to prevent duplication
		if err := tx.Where("material_id = ?", material.ID).Delete(&models.RTUMaterialUnit{}).Error; err != nil {
			return err
		}
		// Default normal save
		errSave := tx.Save(material).Error
		if errSave == nil && material.Units != nil {
			tx.Model(material).Association("Units").Replace(material.Units)
		}
		if errSave == nil {
			history := models.RTUMaterialHistory{
				ID:          uuid.New(),
				MaterialID:  material.ID,
				Action:      "UPDATED",
				Changes:     compareMaterialChanges(&old, material),
				PerformedBy: material.UpdatedBy,
				CreatedAt:   time.Now(),
			}
			tx.Create(&history)
		}
		return errSave
	})
}

func (r *rtuMaterialRepository) Delete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.RTUMaterial{}).Where("id = ?", id).Updates(map[string]interface{}{
			"is_deleted": true,
			"updated_by": deletedBy,
			"deleted_at": gorm.Expr("NOW()"),
		}).Error; err != nil {
			return err
		}
		history := models.RTUMaterialHistory{
			ID:          uuid.New(),
			MaterialID:  id,
			Action:      "DELETED",
			Changes:     "Bahan baku dipindahkan ke Recycle Bin",
			PerformedBy: &deletedBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuMaterialRepository) Restore(ctx context.Context, id uuid.UUID, restoredBy *uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.RTUMaterial{}).Where("id = ?", id).Updates(map[string]interface{}{
			"is_deleted": false,
			"deleted_at": nil,
		}).Error; err != nil {
			return err
		}
		history := models.RTUMaterialHistory{
			ID:          uuid.New(),
			MaterialID:  id,
			Action:      "RESTORED",
			Changes:     "Bahan baku dipulihkan dari Recycle Bin",
			PerformedBy: restoredBy,
			CreatedAt:   time.Now(),
		}
		return tx.Create(&history).Error
	})
}

func (r *rtuMaterialRepository) AddPriceHistory(ctx context.Context, history *models.RTUMaterialPriceHistory) error {
	return r.db.WithContext(ctx).Create(history).Error
}

func (r *rtuMaterialRepository) GetPriceHistory(ctx context.Context, materialID uuid.UUID, outletID *uuid.UUID) ([]models.RTUMaterialPriceHistory, error) {
	var history []models.RTUMaterialPriceHistory
	query := r.db.WithContext(ctx).Preload("Vendor").Preload("Outlet").Where("material_id = ?", materialID)
	if outletID != nil {
		query = query.Where("outlet_id = ?", *outletID)
	} else {
		query = query.Where("outlet_id IS NULL")
	}
	err := query.Order("effective_date DESC, created_at DESC").Find(&history).Error
	return history, err
}

func (r *rtuMaterialRepository) AddLedgerEntry(ctx context.Context, entry *models.RTUStockLedger) error {
	return r.db.WithContext(ctx).Create(entry).Error
}

func (r *rtuMaterialRepository) GetStockLedger(ctx context.Context, materialID uuid.UUID) ([]models.RTUStockLedger, error) {
	var ledger []models.RTUStockLedger
	err := r.db.WithContext(ctx).Where("material_id = ?", materialID).Order("created_at DESC").Find(&ledger).Error
	return ledger, err
}

func (r *rtuMaterialRepository) WithTransaction(tx *gorm.DB) RTUMaterialRepository {
	return &rtuMaterialRepository{db: tx}
}

func (r *rtuMaterialRepository) SetOutletVendor(ctx context.Context, mapping *models.RTUOutletMaterialVendor) error {
	return r.db.WithContext(ctx).Save(mapping).Error
}

func (r *rtuMaterialRepository) GetOutletVendor(ctx context.Context, materialID uuid.UUID, outletID uuid.UUID) (*models.RTUOutletMaterialVendor, error) {
	var mapping models.RTUOutletMaterialVendor
	err := r.db.WithContext(ctx).Preload("Vendor").Where("material_id = ? AND outlet_id = ?", materialID, outletID).First(&mapping).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &mapping, nil
}

func (r *rtuMaterialRepository) HardDelete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Delete associated material units first
		if err := tx.Where("material_id = ?", id).Delete(&models.RTUMaterialUnit{}).Error; err != nil {
			return err
		}
		// 2. Delete the material itself
		if err := tx.Delete(&models.RTUMaterial{}, id).Error; err != nil {
			return err
		}
		return nil
	})
}
