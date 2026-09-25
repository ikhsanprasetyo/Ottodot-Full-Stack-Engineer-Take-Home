package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/websocket"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)


type RTUVendorController struct {
	vendorRepo repositories.RTUVendorRepository
	hub        *websocket.Hub
}

func NewRTUVendorController(vendorRepo repositories.RTUVendorRepository, hub *websocket.Hub) *RTUVendorController {
	return &RTUVendorController{
		vendorRepo: vendorRepo,
		hub:        hub,
	}
}

func (c *RTUVendorController) GetVendors(ctx *gin.Context) {
	search := ctx.Query("search")
	category := ctx.Query("category")
	var isActive *bool
	if activeStr := ctx.Query("is_active"); activeStr != "" {
		active, err := strconv.ParseBool(activeStr)
		if err == nil {
			isActive = &active
		}
	}

	showDeleted := false
	if showDeletedStr := ctx.Query("show_deleted"); showDeletedStr != "" {
		if val, err := strconv.ParseBool(showDeletedStr); err == nil {
			showDeleted = val
		}
	}

	vendors, err := c.vendorRepo.FindAll(ctx.Request.Context(), search, isActive, category, showDeleted)
	if err != nil {
		logger.Log.Error("Failed to fetch vendors", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch vendors"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    vendors,
	})
}

func (c *RTUVendorController) GetVendor(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid vendor ID format"})
		return
	}

	vendor, err := c.vendorRepo.FindByID(ctx.Request.Context(), id)
	if err != nil {
		logger.Log.Error("Failed to fetch vendor", zap.Error(err), zap.String("id", idParam))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch vendor details"})
		return
	}

	if vendor == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Vendor not found"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": vendor})
}

func (c *RTUVendorController) CreateVendor(ctx *gin.Context) {
	var input struct {
		Code            string                     `json:"code" binding:"required"`
		Name            string                     `json:"name" binding:"required"`
		Category        string                     `json:"category"`
		Contacts        []models.VendorContact     `json:"contacts"`
		Links           []models.VendorLink        `json:"links"`
		Branches        []models.VendorBranch      `json:"branches"`
		PaymentTermDays int                        `json:"paymentTermDays"`
		Notes           *string                    `json:"notes"`
		BankAccounts    []models.VendorBankAccount `json:"bankAccounts"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	vendor := &models.RTUVendor{
		Code:            input.Code,
		Name:            input.Name,
		Category:        input.Category,
		Contacts:        input.Contacts,
		Links:           input.Links,
		Branches:        input.Branches,
		PaymentTermDays: input.PaymentTermDays,
		Notes:           input.Notes,
		BankAccounts:    input.BankAccounts,
		IsActive:        true,
	}

	uPtr := getUserIDFromContext(ctx)
	if uPtr != nil {
		vendor.CreatedBy = uPtr
		vendor.UpdatedBy = uPtr
	}

	if err := c.vendorRepo.Create(ctx.Request.Context(), vendor); err != nil {
		logger.Log.Error("Failed to create vendor", zap.Error(err))
		if CheckDuplicateError(ctx, err, "vendor") {
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create vendor"})
		return
	}

	// Realtime invalidate
	c.hub.Broadcast("invalidate_query", []string{"rtu-vendors"})

	ctx.JSON(http.StatusCreated, gin.H{"success": true, "data": vendor})
}

func (c *RTUVendorController) UpdateVendor(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid vendor ID"})
		return
	}

	var input struct {
		Code            string                     `json:"code" binding:"required"`
		Name            string                     `json:"name" binding:"required"`
		Category        string                     `json:"category"`
		Contacts        []models.VendorContact     `json:"contacts"`
		Links           []models.VendorLink        `json:"links"`
		Branches        []models.VendorBranch      `json:"branches"`
		PaymentTermDays int                        `json:"paymentTermDays"`
		Notes           *string                    `json:"notes"`
		IsActive        bool                       `json:"isActive"`
		BankAccounts    []models.VendorBankAccount `json:"bankAccounts"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	vendor, err := c.vendorRepo.FindByID(ctx.Request.Context(), id)
	if err != nil || vendor == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Vendor not found"})
		return
	}

	vendor.Code = input.Code
	vendor.Name = input.Name
	vendor.Category = input.Category
	vendor.Contacts = input.Contacts
	vendor.Links = input.Links
	vendor.Branches = input.Branches
	vendor.PaymentTermDays = input.PaymentTermDays
	vendor.Notes = input.Notes
	vendor.IsActive = input.IsActive
	vendor.BankAccounts = input.BankAccounts

	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		vendor.UpdatedBy = uPtr
	}

	if err := c.vendorRepo.Update(ctx.Request.Context(), vendor); err != nil {
		logger.Log.Error("Failed to update vendor", zap.Error(err))
		if CheckDuplicateError(ctx, err, "vendor") {
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to update vendor"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-vendors", "rtu-vendor-" + idParam})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": vendor})
}

func (c *RTUVendorController) DeleteVendor(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid vendor ID"})
		return
	}

	var deletedBy uuid.UUID
	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		deletedBy = *uPtr
	}

	if err := c.vendorRepo.Delete(ctx.Request.Context(), id, deletedBy); err != nil {
		logger.Log.Error("Failed to delete vendor", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to delete vendor"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-vendors"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Vendor deleted successfully"})
}

func (c *RTUVendorController) RestoreVendor(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid vendor ID"})
		return
	}

	restoredBy := getUserIDFromContext(ctx)
	if err := c.vendorRepo.Restore(ctx.Request.Context(), id, restoredBy); err != nil {
		logger.Log.Error("Failed to restore vendor", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to restore vendor"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-vendors"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Vendor restored successfully"})
}

func (c *RTUVendorController) HardDeleteVendor(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid vendor ID"})
		return
	}

	if err := c.vendorRepo.HardDelete(ctx.Request.Context(), id); err != nil {
		logger.Log.Error("Failed to hard delete vendor", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to permanently delete vendor"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-vendors"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Vendor permanently deleted successfully"})
}

