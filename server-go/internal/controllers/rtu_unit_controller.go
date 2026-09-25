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

type RTUUnitController struct {
	unitRepo repositories.RTUUnitRepository
	hub      *websocket.Hub
}

func NewRTUUnitController(unitRepo repositories.RTUUnitRepository, hub *websocket.Hub) *RTUUnitController {
	return &RTUUnitController{
		unitRepo: unitRepo,
		hub:      hub,
	}
}

func (c *RTUUnitController) GetUnits(ctx *gin.Context) {
	search := ctx.Query("search")
	var isActive *bool
	if activeStr := ctx.Query("is_active"); activeStr != "" {
		active, err := strconv.ParseBool(activeStr)
		if err == nil {
			isActive = &active
		}
	}

	showDeleted := false
	if showDeletedStr := ctx.Query("show_deleted"); showDeletedStr != "" {
		showDeleted = showDeletedStr == "true"
	}

	units, err := c.unitRepo.FindAll(ctx.Request.Context(), search, isActive, showDeleted)
	if err != nil {
		logger.Log.Error("Failed to fetch units", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch units"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    units,
	})
}

func (c *RTUUnitController) GetUnit(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid unit ID format"})
		return
	}

	unit, err := c.unitRepo.FindByID(ctx.Request.Context(), id)
	if err != nil {
		logger.Log.Error("Failed to fetch unit", zap.Error(err), zap.String("id", idParam))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch unit details"})
		return
	}

	if unit == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Unit not found"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": unit})
}

func (c *RTUUnitController) CreateUnit(ctx *gin.Context) {
	var input struct {
		Name     string `json:"name" binding:"required"`
		Level    int    `json:"level"`
		IsActive *bool  `json:"isActive"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	unit := &models.RTUUnit{
		Name:     input.Name,
		Level:    input.Level,
		IsActive: isActive,
	}

	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		unit.UpdatedBy = uPtr
	}

	if err := c.unitRepo.Create(ctx.Request.Context(), unit); err != nil {
		logger.Log.Error("Failed to create unit", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create unit"})
		return
	}

	// Realtime invalidate
	c.hub.Broadcast("invalidate_query", []string{"rtu-units"})

	ctx.JSON(http.StatusCreated, gin.H{"success": true, "data": unit})
}

func (c *RTUUnitController) UpdateUnit(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid unit ID"})
		return
	}

	var input struct {
		Name     string `json:"name" binding:"required"`
		Level    int    `json:"level"`
		IsActive bool   `json:"isActive"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	unit, err := c.unitRepo.FindByID(ctx.Request.Context(), id)
	if err != nil || unit == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Unit not found"})
		return
	}

	unit.Name = input.Name
	unit.Level = input.Level
	unit.IsActive = input.IsActive

	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		unit.UpdatedBy = uPtr
	}

	if err := c.unitRepo.Update(ctx.Request.Context(), unit); err != nil {
		logger.Log.Error("Failed to update unit", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to update unit"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-units", "rtu-unit-" + idParam})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": unit})
}

func (c *RTUUnitController) DeleteUnit(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid unit ID"})
		return
	}

	var deletedBy uuid.UUID
	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		deletedBy = *uPtr
	}

	if err := c.unitRepo.Delete(ctx.Request.Context(), id, deletedBy); err != nil {
		logger.Log.Error("Failed to delete unit", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to delete unit"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-units"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Unit deleted successfully"})
}

func (c *RTUUnitController) RestoreUnit(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid unit ID"})
		return
	}

	if err := c.unitRepo.Restore(ctx.Request.Context(), id); err != nil {
		logger.Log.Error("Failed to restore unit", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to restore unit"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-units"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Unit restored successfully"})
}

func (c *RTUUnitController) HardDeleteUnit(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid unit ID"})
		return
	}

	if err := c.unitRepo.HardDelete(ctx.Request.Context(), id); err != nil {
		logger.Log.Error("Failed to permanently delete unit", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to permanently delete unit"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-units"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Unit permanently deleted successfully"})
}
