package controllers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/websocket"
)


type RTUProductController struct {
	repo repositories.RTUProductRepository
	hub  *websocket.Hub
}

func NewRTUProductController(repo repositories.RTUProductRepository, hub *websocket.Hub) *RTUProductController {
	return &RTUProductController{repo: repo, hub: hub}
}

func (c *RTUProductController) CreateProduct(ctx *gin.Context) {
	var input struct {
		Code        string `json:"code" binding:"required"`
		Name        string `json:"name" binding:"required"`
		Category    string `json:"category"`
		OutputUnit  string `json:"outputUnit" binding:"required"`
		Description string `json:"description"`
		Barcode     string `json:"barcode"`
		ImageURL    string `json:"imageUrl"`
		MinStock    float64 `json:"minStock"`
		Units       []struct {
			UnitName           string   `json:"unitName"`
			Conversion         float64  `json:"conversion"`
			RelativeToUnit     *string  `json:"relativeToUnit"`
			RelativeConversion *float64 `json:"relativeConversion"`
			Barcode            string   `json:"barcode"`
		} `json:"units"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid input: " + err.Error()})
		return
	}

	product := &models.RTUProduct{
		Code:        input.Code,
		Name:        input.Name,
		Category:    input.Category,
		OutputUnit:  input.OutputUnit,
		Description: input.Description,
		Barcode:     input.Barcode,
		ImageURL:    input.ImageURL,
		MinStock:    input.MinStock,
		IsActive:    true,
	}

	for _, u := range input.Units {
		product.Units = append(product.Units, models.RTUProductUnit{
			UnitName:           u.UnitName,
			Conversion:         u.Conversion,
			RelativeToUnit:     u.RelativeToUnit,
			RelativeConversion: u.RelativeConversion,
			Barcode:            u.Barcode,
		})
	}

	uPtr := getUserIDFromContext(ctx)
	if uPtr != nil {
		product.CreatedBy = uPtr
		product.UpdatedBy = uPtr
	}

	if err := c.repo.Create(ctx.Request.Context(), product); err != nil {
		if CheckDuplicateError(ctx, err, "produk") {
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create product"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-products"})

	ctx.JSON(http.StatusCreated, gin.H{"success": true, "data": product})
}

func (c *RTUProductController) GetProducts(ctx *gin.Context) {
	search := ctx.Query("search")
	category := ctx.Query("category")
	var isActive *bool
	if activeStr := ctx.Query("is_active"); activeStr != "" {
		active := activeStr == "true"
		isActive = &active
	}

	var outletID *uuid.UUID
	if outletStr := ctx.Query("outlet_id"); outletStr != "" {
		if v, err := uuid.Parse(outletStr); err == nil {
			outletID = &v
		}
	}

	showDeleted := false
	if showDeletedStr := ctx.Query("show_deleted"); showDeletedStr != "" {
		showDeleted = showDeletedStr == "true"
	}

	products, err := c.repo.FindAll(ctx.Request.Context(), search, isActive, outletID, category, showDeleted)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch products"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": products})
}

func (c *RTUProductController) GetProduct(ctx *gin.Context) {
	id := ctx.Param("id")
	product, err := c.repo.FindByID(ctx.Request.Context(), id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch product"})
		return
	}
	if product == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Product not found"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": product})
}

func (c *RTUProductController) UpdateProduct(ctx *gin.Context) {
	id := ctx.Param("id")
	product, err := c.repo.FindByID(ctx.Request.Context(), id)
	if err != nil || product == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Product not found"})
		return
	}

	var input struct {
		Code        string `json:"code"`
		Name        string `json:"name"`
		Category    string `json:"category"`
		OutputUnit  string `json:"outputUnit"`
		Description string `json:"description"`
		Barcode     string `json:"barcode"`
		ImageURL    string `json:"imageUrl"`
		IsActive    *bool  `json:"isActive"`
		MinStock    float64 `json:"minStock"`
		Units       []struct {
			UnitName           string   `json:"unitName"`
			Conversion         float64  `json:"conversion"`
			RelativeToUnit     *string  `json:"relativeToUnit"`
			RelativeConversion *float64 `json:"relativeConversion"`
			Barcode            string   `json:"barcode"`
		} `json:"units"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid input"})
		return
	}

	if input.Code != "" {
		product.Code = input.Code
	}
	if input.Name != "" {
		product.Name = input.Name
	}
	product.Category = input.Category
	if input.OutputUnit != "" {
		product.OutputUnit = input.OutputUnit
	}
	product.Description = input.Description
	if input.Barcode != "" {
		product.Barcode = input.Barcode
	}
	// If the image URL changed, delete the old file from server filesystem
	if product.ImageURL != "" && product.ImageURL != input.ImageURL {
		deleteLocalFile(product.ImageURL)
	}
	product.ImageURL = input.ImageURL
	if input.IsActive != nil {
		product.IsActive = *input.IsActive
	}
	product.MinStock = input.MinStock

	product.Units = []models.RTUProductUnit{}
	for _, u := range input.Units {
		product.Units = append(product.Units, models.RTUProductUnit{
			UnitName:           u.UnitName,
			Conversion:         u.Conversion,
			RelativeToUnit:     u.RelativeToUnit,
			RelativeConversion: u.RelativeConversion,
			Barcode:            u.Barcode,
		})
	}

	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		product.UpdatedBy = uPtr
	}

	if err := c.repo.Update(ctx.Request.Context(), product); err != nil {
		if CheckDuplicateError(ctx, err, "produk") {
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": fmt.Sprintf("Failed to update product: %v", err)})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-products", "rtu-product"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": product})
}

func (c *RTUProductController) DeleteProduct(ctx *gin.Context) {
	id := ctx.Param("id")

	var deletedBy uuid.UUID
	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		deletedBy = *uPtr
	}

	if err := c.repo.Delete(ctx.Request.Context(), id, deletedBy); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to delete product"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-products"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Product deleted successfully"})
}

func (c *RTUProductController) GetLots(ctx *gin.Context) {
	productIDStr := ctx.Param("id")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid product ID"})
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
                Where("product_id = ? AND outlet_id = ? AND qty_remaining != 0", productID, outletID).
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

func (c *RTUProductController) RestoreProduct(ctx *gin.Context) {
	id := ctx.Param("id")

	restoredBy := getUserIDFromContext(ctx)
	if err := c.repo.Restore(ctx.Request.Context(), id, restoredBy); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to restore product"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-products"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Product restored successfully"})
}

func (c *RTUProductController) HardDeleteProduct(ctx *gin.Context) {
	id := ctx.Param("id")

	// Find product first unscoped to get its image URL for deletion
	if product, err := c.repo.FindByIDUnscoped(ctx.Request.Context(), id); err == nil && product != nil && product.ImageURL != "" {
		deleteLocalFile(product.ImageURL)
	}

	if err := c.repo.HardDelete(ctx.Request.Context(), id); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to permanently delete product"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-products"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Product permanently deleted successfully"})
}


