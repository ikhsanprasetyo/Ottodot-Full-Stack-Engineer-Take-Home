package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/services"
	"github.com/yourusername/kpi-backend/internal/websocket"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)


type RTUMaterialController struct {
	materialRepo    repositories.RTUMaterialRepository
	materialService services.RTUMaterialService
	hub             *websocket.Hub
}

func NewRTUMaterialController(materialRepo repositories.RTUMaterialRepository, materialService services.RTUMaterialService, hub *websocket.Hub) *RTUMaterialController {
	return &RTUMaterialController{
		materialRepo:    materialRepo,
		materialService: materialService,
		hub:             hub,
	}
}

func (c *RTUMaterialController) GetMaterials(ctx *gin.Context) {
	search := ctx.Query("search")
	var isActive *bool
	if activeStr := ctx.Query("is_active"); activeStr != "" {
		if active, err := strconv.ParseBool(activeStr); err == nil {
			isActive = &active
		}
	}
	var vendorID *uuid.UUID
	if vendorStr := ctx.Query("vendor_id"); vendorStr != "" {
		if v, err := uuid.Parse(vendorStr); err == nil {
			vendorID = &v
		}
	}

	var outletID *uuid.UUID
	if outletStr := ctx.Query("outlet_id"); outletStr != "" {
		if v, err := uuid.Parse(outletStr); err == nil {
			outletID = &v
		}
	}

	category := ctx.Query("category")
	showDeleted := ctx.Query("show_deleted") == "true"

	materials, err := c.materialRepo.FindAll(ctx.Request.Context(), search, isActive, vendorID, outletID, category, showDeleted)
	if err != nil {
		logger.Log.Error("Failed to fetch materials", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch materials"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": materials})
}

func (c *RTUMaterialController) GetMaterial(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	material, err := c.materialRepo.FindByID(ctx.Request.Context(), id)
	if err != nil || material == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Material not found"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": material})
}

func (c *RTUMaterialController) CreateMaterial(ctx *gin.Context) {
	var input struct {
		Code        string     `json:"code" binding:"required"`
		Name        string     `json:"name" binding:"required"`
		Brand       string     `json:"brand"`
		Category    string     `json:"category"`
		Unit        string     `json:"unit" binding:"required"`
		VendorID    *uuid.UUID `json:"vendorId"`
		MinStock    float64    `json:"minStock"`
		Description *string    `json:"description"`
		Barcode     string     `json:"barcode"`
		ImageURL    string     `json:"imageUrl"`
		Units []struct {
			UnitName           string   `json:"unitName"`
			Conversion         float64  `json:"conversion"`
			RelativeToUnit     *string  `json:"relativeToUnit"`
			RelativeConversion *float64 `json:"relativeConversion"`
			Barcode            string   `json:"barcode"`
		} `json:"units"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	material := &models.RTUMaterial{
		Code:        input.Code,
		Name:        input.Name,
		Brand:       input.Brand,
		Category:    input.Category,
		Unit:        input.Unit,
		VendorID:    input.VendorID,
		MinStock:    input.MinStock,
		Description: input.Description,
		Barcode:     input.Barcode,
		ImageURL:    input.ImageURL,
		IsActive:    true,
	}

	for _, u := range input.Units {
		material.Units = append(material.Units, models.RTUMaterialUnit{
			UnitName:           u.UnitName,
			Conversion:         u.Conversion,
			RelativeToUnit:     u.RelativeToUnit,
			RelativeConversion: u.RelativeConversion,
			Barcode:            u.Barcode,
		})
	}

	uPtr := getUserIDFromContext(ctx)
	if uPtr != nil {
		material.CreatedBy = uPtr
		material.UpdatedBy = uPtr
	}

	if err := c.materialRepo.Create(ctx.Request.Context(), material); err != nil {
		logger.Log.Error("Failed to create material", zap.Error(err))
		if CheckDuplicateError(ctx, err, "material") {
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create material"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-materials"})

	ctx.JSON(http.StatusCreated, gin.H{"success": true, "data": material})
}

func (c *RTUMaterialController) UpdateMaterial(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	var input struct {
		Code        string     `json:"code" binding:"required"`
		Name        string     `json:"name" binding:"required"`
		Brand       string     `json:"brand"`
		Category    string     `json:"category"`
		Unit        string     `json:"unit" binding:"required"`
		VendorID    *uuid.UUID `json:"vendorId"`
		MinStock    float64    `json:"minStock"`
		Description *string    `json:"description"`
		Barcode     string     `json:"barcode"`
		ImageURL    string     `json:"imageUrl"`
		IsActive    bool       `json:"isActive"`
		Units []struct {
			UnitName           string   `json:"unitName"`
			Conversion         float64  `json:"conversion"`
			RelativeToUnit     *string  `json:"relativeToUnit"`
			RelativeConversion *float64 `json:"relativeConversion"`
			Barcode            string   `json:"barcode"`
		} `json:"units"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	material, err := c.materialRepo.FindByID(ctx.Request.Context(), id)
	if err != nil || material == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Material not found"})
		return
	}

	material.Code = input.Code
	material.Name = input.Name
	material.Brand = input.Brand
	material.Category = input.Category
	material.Unit = input.Unit
	material.VendorID = input.VendorID
	material.MinStock = input.MinStock
	material.Description = input.Description
	material.Barcode = input.Barcode
	// If the image URL changed, delete the old file from server filesystem
	if material.ImageURL != "" && material.ImageURL != input.ImageURL {
		deleteLocalFile(material.ImageURL)
	}
	material.ImageURL = input.ImageURL
	material.IsActive = input.IsActive

	// Reset units for replacement
	material.Units = []models.RTUMaterialUnit{}
	for _, u := range input.Units {
		material.Units = append(material.Units, models.RTUMaterialUnit{
			UnitName:           u.UnitName,
			Conversion:         u.Conversion,
			RelativeToUnit:     u.RelativeToUnit,
			RelativeConversion: u.RelativeConversion,
			Barcode:            u.Barcode,
		})
	}

	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		material.UpdatedBy = uPtr
	}

	if err := c.materialRepo.Update(ctx.Request.Context(), material); err != nil {
		logger.Log.Error("Failed to update material", zap.Error(err))
		if CheckDuplicateError(ctx, err, "material") {
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to update material"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-materials", "rtu-material-" + idParam})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": material})
}

func (c *RTUMaterialController) DeleteMaterial(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	var deletedBy uuid.UUID
	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		deletedBy = *uPtr
	}

	if err := c.materialRepo.Delete(ctx.Request.Context(), id, deletedBy); err != nil {
		logger.Log.Error("Failed to delete material", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to delete material"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-materials"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Material deleted"})
}

func (c *RTUMaterialController) UpdatePrice(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	var input struct {
		Price    float64    `json:"price" binding:"required"`
		VendorID *uuid.UUID `json:"vendorId"`
		OutletID *uuid.UUID `json:"outletId"`
		Source   string     `json:"source"`
		Notes    *string    `json:"notes"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var updatedBy uuid.UUID
	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		updatedBy = *uPtr
	}

	source := input.Source
	if source == "" {
		source = "manual"
	}

	if err := c.materialService.UpdatePrice(ctx.Request.Context(), id, input.OutletID, input.Price, input.VendorID, source, input.Notes, updatedBy); err != nil {
		logger.Log.Error("Failed to update material price", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to update price"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-materials", "rtu-material-" + idParam, "rtu-material-price-" + idParam})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Price updated successfully"})
}

func (c *RTUMaterialController) GetPriceHistory(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	var outletID *uuid.UUID
	if outletStr := ctx.Query("outlet_id"); outletStr != "" {
		if v, err := uuid.Parse(outletStr); err == nil {
			outletID = &v
		}
	}

	history, err := c.materialRepo.GetPriceHistory(ctx.Request.Context(), id, outletID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch price history"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": history})
}

func (c *RTUMaterialController) GetStockLedger(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	ledger, err := c.materialRepo.GetStockLedger(ctx.Request.Context(), id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch stock ledger"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": ledger})
}

func (c *RTUMaterialController) AdjustStock(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	var input struct {
		Qty          float64    `json:"qty" binding:"required"`
		MovementType string     `json:"movementType" binding:"required"`
		OutletID     uuid.UUID  `json:"outletId" binding:"required"`
		Notes        *string    `json:"notes"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var updatedBy uuid.UUID
	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		updatedBy = *uPtr
	}

	if err := c.materialService.AdjustStock(ctx.Request.Context(), id, input.OutletID, input.Qty, input.MovementType, "manual", nil, input.Notes, updatedBy); err != nil {
		logger.Log.Error("Failed to adjust stock", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-materials", "rtu-stock-ledgers", "rtu-material-" + idParam, "rtu-material-ledger-" + idParam})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Stock adjusted successfully"})
}

func (c *RTUMaterialController) RestoreMaterial(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	restoredBy := getUserIDFromContext(ctx)
	if err := c.materialRepo.Restore(ctx.Request.Context(), id, restoredBy); err != nil {
		logger.Log.Error("Failed to restore material", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to restore material"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-materials"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Material restored successfully"})
}

func (c *RTUMaterialController) HardDeleteMaterial(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	// Find material first (including soft-deleted ones) to get its image URL for deletion
	if material, err := c.materialRepo.FindByIDUnscoped(ctx.Request.Context(), id); err == nil && material != nil && material.ImageURL != "" {
		deleteLocalFile(material.ImageURL)
	}

	if err := c.materialRepo.HardDelete(ctx.Request.Context(), id); err != nil {
		logger.Log.Error("Failed to permanently delete material", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to permanently delete material"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-materials"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Material permanently deleted"})
}

func (c *RTUMaterialController) SetOutletVendor(ctx *gin.Context) {
	var input struct {
		MaterialID uuid.UUID `json:"materialId" binding:"required"`
		OutletID   uuid.UUID `json:"outletId" binding:"required"`
		VendorID   uuid.UUID `json:"vendorId" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	mapping := &models.RTUOutletMaterialVendor{
		MaterialID:        input.MaterialID,
		OutletID:          input.OutletID,
		PreferredVendorID: input.VendorID,
		UpdatedAt:         time.Now(),
	}

	if err := c.materialRepo.SetOutletVendor(ctx.Request.Context(), mapping); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to set outlet vendor"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Vendor mapping updated"})
}

func (c *RTUMaterialController) GetOutletVendor(ctx *gin.Context) {
	materialIDStr := ctx.Query("material_id")
	outletIDStr := ctx.Query("outlet_id")

	materialID, err := uuid.Parse(materialIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	outletID, err := uuid.Parse(outletIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid outlet ID"})
		return
	}

	mapping, err := c.materialRepo.GetOutletVendor(ctx.Request.Context(), materialID, outletID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch vendor mapping"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": mapping})
}

func (c *RTUMaterialController) GetLots(ctx *gin.Context) {
	materialIDStr := ctx.Param("id")
	materialID, err := uuid.Parse(materialIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid material ID"})
		return
	}

	outletIDStr := ctx.Query("outlet_id")
	outletID, err := uuid.Parse(outletIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid or missing outlet ID"})
		return
	}

        var lots []models.RTUStockLot
        err = config.DB.WithContext(ctx.Request.Context()).
                Preload("Movements").
                Where("material_id = ? AND outlet_id = ? AND qty_remaining != 0", materialID, outletID).
                Order("received_date ASC, created_at ASC").
                Find(&lots).Error

        if err != nil {
                ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch stock lots"})
                return
        }

        // Populasikan informasi tambahan seperti nama outlet tujuan distribusi
        for i := range lots {
                for j := range lots[i].Movements {
                        mov := &lots[i].Movements[j]
                        if mov.RefType == "DISTRIBUTION" {
                                var dist models.RTUDistribution
                                if err := config.DB.Preload("Outlet").First(&dist, "id = ?", mov.RefID).Error; err == nil && dist.Outlet != nil {
                                        mov.RefInfo = dist.Outlet.Label
                                }
                        }
                }
        }

        ctx.JSON(http.StatusOK, gin.H{"success": true, "data": lots})
}


