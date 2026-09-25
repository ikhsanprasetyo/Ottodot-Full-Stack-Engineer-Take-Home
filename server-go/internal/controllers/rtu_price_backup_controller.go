package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/websocket"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

type RTUPriceBackupController struct {
	db           *gorm.DB
	backupRepo   repositories.RTUPriceBackupRepository
	materialRepo repositories.RTUMaterialRepository
	productRepo  repositories.RTUProductRepository
	hub          *websocket.Hub
}

func NewRTUPriceBackupController(
	db *gorm.DB,
	backupRepo repositories.RTUPriceBackupRepository,
	materialRepo repositories.RTUMaterialRepository,
	productRepo repositories.RTUProductRepository,
	hub *websocket.Hub,
) *RTUPriceBackupController {
	return &RTUPriceBackupController{
		db:           db,
		backupRepo:   backupRepo,
		materialRepo: materialRepo,
		productRepo:  productRepo,
		hub:          hub,
	}
}

type MaterialPriceItem struct {
	MaterialID uuid.UUID `json:"materialId"`
	Code       string    `json:"code"`
	Name       string    `json:"name"`
	Unit       string    `json:"unit"`
	Price      float64   `json:"price"`
}

type ProductPriceItem struct {
	ProductID  uuid.UUID `json:"productId"`
	Code       string    `json:"code"`
	Name       string    `json:"name"`
	OutputUnit string    `json:"outputUnit"`
	Price      float64   `json:"price"`
}

// POST /api/rtu/material/copy-prices
func (c *RTUPriceBackupController) CopyMaterialPrices(ctx *gin.Context) {
	var input struct {
		SourceOutletID uuid.UUID `json:"sourceOutletId" binding:"required"`
		TargetOutletID uuid.UUID `json:"targetOutletId" binding:"required"`
		Notes          string    `json:"notes"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Source and Target Outlet are required"})
		return
	}

	if input.SourceOutletID == input.TargetOutletID {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Source and Target Outlet cannot be the same"})
		return
	}

	userPtr := getUserIDFromContext(ctx)

	reqCtx := ctx.Request.Context()

	// 1. Fetch current target outlet materials to build snapshot backup
	targetMaterials, err := c.materialRepo.FindAll(reqCtx, "", nil, nil, &input.TargetOutletID, "", false)
	if err != nil {
		logger.Log.Error("Failed to fetch target materials for backup", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create backup snapshot"})
		return
	}

	var targetSnapshot []MaterialPriceItem
	for _, m := range targetMaterials {
		targetSnapshot = append(targetSnapshot, MaterialPriceItem{
			MaterialID: m.ID,
			Code:       m.Code,
			Name:       m.Name,
			Unit:       m.Unit,
			Price:      m.CurrentPrice,
		})
	}

	snapshotJSON, err := json.Marshal(targetSnapshot)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to serialize backup data"})
		return
	}

	// 2. Fetch source outlet materials
	sourceMaterials, err := c.materialRepo.FindAll(reqCtx, "", nil, nil, &input.SourceOutletID, "", false)
	if err != nil {
		logger.Log.Error("Failed to fetch source materials", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch source prices"})
		return
	}

	now := time.Now()

	// 3. Execute Transaction
	err = c.db.WithContext(reqCtx).Transaction(func(tx *gorm.DB) error {
		// A. Save DB Backup
		notes := input.Notes
		if notes == "" {
			notes = "Auto backup before copying prices from source outlet to target outlet"
		}
		backup := &models.RTUPriceBackup{
			EntityType:     "MATERIAL",
			TargetOutletID: input.TargetOutletID,
			SourceOutletID: &input.SourceOutletID,
			Notes:          notes,
			BackupData:     string(snapshotJSON),
			CreatedBy:      userPtr,
			CreatedAt:      now,
		}
		if err := tx.Create(backup).Error; err != nil {
			return err
		}

		// B. Update Target Outlet Stock Prices
		for _, sm := range sourceMaterials {
			var stock models.RTUOutletMaterialStock
			err := tx.Where("material_id = ? AND outlet_id = ?", sm.ID, input.TargetOutletID).First(&stock).Error
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					stock = models.RTUOutletMaterialStock{
						MaterialID:    sm.ID,
						OutletID:      input.TargetOutletID,
						CurrentStock:  0,
						MinStock:      0,
						CurrentPrice:  sm.CurrentPrice,
						LastPriceDate: &now,
						UpdatedAt:     now,
					}
					if err := tx.Create(&stock).Error; err != nil {
						return err
					}
				} else {
					return err
				}
			} else {
				stock.CurrentPrice = sm.CurrentPrice
				stock.LastPriceDate = &now
				stock.UpdatedAt = now
				if err := tx.Save(&stock).Error; err != nil {
					return err
				}
			}

			// Add Price History Record
			history := models.RTUMaterialPriceHistory{
				MaterialID:    sm.ID,
				OutletID:      &input.TargetOutletID,
				Price:         sm.CurrentPrice,
				EffectiveDate: now,
				Source:        "copy_outlet",
				CreatedBy:     userPtr,
				CreatedAt:     now,
			}
			if err := tx.Create(&history).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		logger.Log.Error("Failed to copy material prices", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to copy material prices"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-materials"})

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Berhasil menyalin harga %d material", len(sourceMaterials)),
	})
}

// GET /api/rtu/material/backups
func (c *RTUPriceBackupController) GetMaterialPriceBackups(ctx *gin.Context) {
	var targetOutletID *uuid.UUID
	if tid := ctx.Query("target_outlet_id"); tid != "" {
		if parsed, err := uuid.Parse(tid); err == nil {
			targetOutletID = &parsed
		}
	}

	backups, err := c.backupRepo.GetBackups(ctx.Request.Context(), "MATERIAL", targetOutletID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to get backups"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": backups})
}

// POST /api/rtu/material/restore-backup/:id
func (c *RTUPriceBackupController) RestoreMaterialPriceBackup(ctx *gin.Context) {
	idParam := ctx.Param("id")
	backupID, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid backup ID"})
		return
	}

	reqCtx := ctx.Request.Context()
	backup, err := c.backupRepo.GetByID(reqCtx, backupID)
	if err != nil || backup == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Backup not found"})
		return
	}

	var items []MaterialPriceItem
	if err := json.Unmarshal([]byte(backup.BackupData), &items); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to parse backup payload"})
		return
	}

	userPtr := getUserIDFromContext(ctx)
	now := time.Now()

	err = c.db.WithContext(reqCtx).Transaction(func(tx *gorm.DB) error {
		for _, item := range items {
			var stock models.RTUOutletMaterialStock
			err := tx.Where("material_id = ? AND outlet_id = ?", item.MaterialID, backup.TargetOutletID).First(&stock).Error
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					stock = models.RTUOutletMaterialStock{
						MaterialID:    item.MaterialID,
						OutletID:      backup.TargetOutletID,
						CurrentStock:  0,
						MinStock:      0,
						CurrentPrice:  item.Price,
						LastPriceDate: &now,
						UpdatedAt:     now,
					}
					if err := tx.Create(&stock).Error; err != nil {
						return err
					}
				} else {
					return err
				}
			} else {
				stock.CurrentPrice = item.Price
				stock.LastPriceDate = &now
				stock.UpdatedAt = now
				if err := tx.Save(&stock).Error; err != nil {
					return err
				}
			}

			history := models.RTUMaterialPriceHistory{
				MaterialID:    item.MaterialID,
				OutletID:      &backup.TargetOutletID,
				Price:         item.Price,
				EffectiveDate: now,
				Source:        "rollback_backup",
				CreatedBy:     userPtr,
				CreatedAt:     now,
			}
			if err := tx.Create(&history).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		logger.Log.Error("Failed to restore material price backup", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to restore backup"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-materials"})

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Berhasil melakukan rollback harga %d material dari backup", len(items)),
	})
}

// POST /api/rtu/product/copy-prices
func (c *RTUPriceBackupController) CopyProductPrices(ctx *gin.Context) {
	var input struct {
		SourceOutletID uuid.UUID `json:"sourceOutletId" binding:"required"`
		TargetOutletID uuid.UUID `json:"targetOutletId" binding:"required"`
		Notes          string    `json:"notes"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Source and Target Outlet are required"})
		return
	}

	if input.SourceOutletID == input.TargetOutletID {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Source and Target Outlet cannot be the same"})
		return
	}

	userPtr := getUserIDFromContext(ctx)
	reqCtx := ctx.Request.Context()

	// 1. Fetch current target outlet products for backup
	targetProducts, err := c.productRepo.FindAll(reqCtx, "", nil, &input.TargetOutletID, "", false)
	if err != nil {
		logger.Log.Error("Failed to fetch target products for backup", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create backup snapshot"})
		return
	}

	var targetSnapshot []ProductPriceItem
	for _, p := range targetProducts {
		targetSnapshot = append(targetSnapshot, ProductPriceItem{
			ProductID:  p.ID,
			Code:       p.Code,
			Name:       p.Name,
			OutputUnit: p.OutputUnit,
			Price:      p.CurrentPrice,
		})
	}

	snapshotJSON, err := json.Marshal(targetSnapshot)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to serialize backup data"})
		return
	}

	// 2. Fetch source outlet products
	sourceProducts, err := c.productRepo.FindAll(reqCtx, "", nil, &input.SourceOutletID, "", false)
	if err != nil {
		logger.Log.Error("Failed to fetch source products", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch source prices"})
		return
	}

	now := time.Now()

	err = c.db.WithContext(reqCtx).Transaction(func(tx *gorm.DB) error {
		notes := input.Notes
		if notes == "" {
			notes = "Auto backup before copying product prices from source outlet to target outlet"
		}
		backup := &models.RTUPriceBackup{
			EntityType:     "PRODUCT",
			TargetOutletID: input.TargetOutletID,
			SourceOutletID: &input.SourceOutletID,
			Notes:          notes,
			BackupData:     string(snapshotJSON),
			CreatedBy:      userPtr,
			CreatedAt:      now,
		}
		if err := tx.Create(backup).Error; err != nil {
			return err
		}

		for _, sp := range sourceProducts {
			var stock models.RTUOutletProductStock
			err := tx.Where("product_id = ? AND outlet_id = ?", sp.ID, input.TargetOutletID).First(&stock).Error
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					stock = models.RTUOutletProductStock{
						ProductID:     sp.ID,
						OutletID:      input.TargetOutletID,
						CurrentStock:  0,
						CurrentPrice:  sp.CurrentPrice,
						LastPriceDate: &now,
						UpdatedAt:     now,
					}
					if err := tx.Create(&stock).Error; err != nil {
						return err
					}
				} else {
					return err
				}
			} else {
				stock.CurrentPrice = sp.CurrentPrice
				stock.LastPriceDate = &now
				stock.UpdatedAt = now
				if err := tx.Save(&stock).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		logger.Log.Error("Failed to copy product prices", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to copy product prices"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-products"})

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Berhasil menyalin harga %d produk", len(sourceProducts)),
	})
}

// GET /api/rtu/product/backups
func (c *RTUPriceBackupController) GetProductPriceBackups(ctx *gin.Context) {
	var targetOutletID *uuid.UUID
	if tid := ctx.Query("target_outlet_id"); tid != "" {
		if parsed, err := uuid.Parse(tid); err == nil {
			targetOutletID = &parsed
		}
	}

	backups, err := c.backupRepo.GetBackups(ctx.Request.Context(), "PRODUCT", targetOutletID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to get backups"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": backups})
}

// POST /api/rtu/product/restore-backup/:id
func (c *RTUPriceBackupController) RestoreProductPriceBackup(ctx *gin.Context) {
	idParam := ctx.Param("id")
	backupID, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid backup ID"})
		return
	}

	reqCtx := ctx.Request.Context()
	backup, err := c.backupRepo.GetByID(reqCtx, backupID)
	if err != nil || backup == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Backup not found"})
		return
	}

	var items []ProductPriceItem
	if err := json.Unmarshal([]byte(backup.BackupData), &items); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to parse backup payload"})
		return
	}

	now := time.Now()

	err = c.db.WithContext(reqCtx).Transaction(func(tx *gorm.DB) error {
		for _, item := range items {
			var stock models.RTUOutletProductStock
			err := tx.Where("product_id = ? AND outlet_id = ?", item.ProductID, backup.TargetOutletID).First(&stock).Error
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					stock = models.RTUOutletProductStock{
						ProductID:     item.ProductID,
						OutletID:      backup.TargetOutletID,
						CurrentStock:  0,
						CurrentPrice:  item.Price,
						LastPriceDate: &now,
						UpdatedAt:     now,
					}
					if err := tx.Create(&stock).Error; err != nil {
						return err
					}
				} else {
					return err
				}
			} else {
				stock.CurrentPrice = item.Price
				stock.LastPriceDate = &now
				stock.UpdatedAt = now
				if err := tx.Save(&stock).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		logger.Log.Error("Failed to restore product price backup", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to restore backup"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-products"})

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Berhasil melakukan rollback harga %d produk dari backup", len(items)),
	})
}
