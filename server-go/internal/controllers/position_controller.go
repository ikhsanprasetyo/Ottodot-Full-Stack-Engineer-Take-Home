package controllers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/utils"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

type PositionController struct {
	positionRepo *repositories.PositionRepository
}

func NewPositionController(positionRepo *repositories.PositionRepository) *PositionController {
	return &PositionController{
		positionRepo: positionRepo,
	}
}

// GetPositions godoc
func (c *PositionController) GetPositions(ctx *gin.Context) {
	offset := utils.ParseInt64(ctx.Query("offset"), 0)
	limit := utils.ParseInt64(ctx.Query("limit"), 10)
	search := strings.TrimSpace(ctx.Query("search"))
	isDeleted := ctx.Query("isDeleted") == "true"
	
	positions, total, err := c.positionRepo.List(ctx.Request.Context(), search, int(offset), int(limit), isDeleted)
	if err != nil {
		logger.Log.Error("Failed to get positions", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to retrieve positions")
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Positions retrieved successfully",
		"data":       positions,
		"total":      total,
		"totalPages": (total + limit - 1) / limit,
	})
}

// GetPosition godoc
func (c *PositionController) GetPosition(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid position ID")
		return
	}
	
	position, err := c.positionRepo.FindByID(ctx.Request.Context(), id)
	if err != nil {
		logger.Log.Error("Failed to get position", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to retrieve position")
		return
	}
	
	if position == nil {
		utils.ErrorResponse(ctx, http.StatusNotFound, "Position not found")
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Position retrieved successfully",
		"data":    position,
	})
}

// CreatePositionRequest
type CreatePositionRequest struct {
	Name  string `json:"name" binding:"required"`
}

// AddPosition godoc
func (c *PositionController) AddPosition(ctx *gin.Context) {
	var req CreatePositionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)
	
	position := &models.Position{
		Name: req.Name,
	}
	
	err := c.positionRepo.Create(ctx.Request.Context(), position, userID)
	if err != nil {
		logger.Log.Error("Failed to create position", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Duplicate position (name must be unique)")
		return
	}
	
	ctx.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Position created successfully",
		"data":    position,
	})
}

// UpdatePositionRequest
type UpdatePositionRequest struct {
	Name  string `json:"name"`
}

// EditPosition godoc
func (c *PositionController) EditPosition(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid position ID")
		return
	}
	
	var req UpdatePositionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request")
		return
	}
	
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)
	
	update := make(map[string]any)
	if req.Name != "" {
		update["name"] = req.Name
	}
	
	updatedPosition, err := c.positionRepo.Update(ctx.Request.Context(), id, update, userID)
	if err != nil {
		logger.Log.Error("Failed to update position", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusNotFound, "Position not found")
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Position updated successfully",
		"data":    updatedPosition,
	})
}

// DeletePosition godoc
func (c *PositionController) DeletePosition(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid position ID")
		return
	}
	
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)
	
	err = c.positionRepo.SoftDelete(ctx.Request.Context(), id, userID)
	if err != nil {
		logger.Log.Error("Failed to delete position", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusNotFound, "Position not found")
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Position deleted successfully",
		"id":      id.String(),
	})
}

// RestorePosition godoc
func (c *PositionController) RestorePosition(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid position ID")
		return
	}
	
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)
	
	restoredPosition, err := c.positionRepo.Restore(ctx.Request.Context(), id, userID)
	if err != nil {
		logger.Log.Error("Failed to restore position", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusNotFound, "Position not found")
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Position restored successfully",
		"data":    restoredPosition,
	})
}
