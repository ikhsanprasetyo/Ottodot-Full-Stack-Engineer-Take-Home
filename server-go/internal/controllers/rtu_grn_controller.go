package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/services"
	"github.com/yourusername/kpi-backend/internal/websocket"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

type RTUGRNController struct {
	grnRepo    repositories.RTUGRNRepository
	grnService services.RTUGRNService
	hub        *websocket.Hub
}

func NewRTUGRNController(grnRepo repositories.RTUGRNRepository, grnService services.RTUGRNService, hub *websocket.Hub) *RTUGRNController {
	return &RTUGRNController{
		grnRepo:    grnRepo,
		grnService: grnService,
		hub:        hub,
	}
}

func (c *RTUGRNController) GetGRNs(ctx *gin.Context) {
	status := ctx.Query("status")
	grns, err := c.grnRepo.FindAll(ctx.Request.Context(), status)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch GRNs"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": grns})
}

func (c *RTUGRNController) GetGRN(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid GRN ID"})
		return
	}

	grn, err := c.grnRepo.FindByID(ctx.Request.Context(), id)
	if err != nil || grn == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "GRN not found"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": grn})
}

func (c *RTUGRNController) CreateGRN(ctx *gin.Context) {
	var grn models.RTUGRN
	if err := ctx.ShouldBindJSON(&grn); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var createdBy uuid.UUID
	if userID, exists := ctx.Get("userID"); exists {
		if u, ok := userID.(uuid.UUID); ok {
			createdBy = u
		} else if uStr, ok := userID.(string); ok {
			createdBy, _ = uuid.Parse(uStr)
		}
	}

	if err := c.grnService.CreateGRN(ctx.Request.Context(), &grn, createdBy); err != nil {
		logger.Log.Error("Failed to create GRN", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create GRN"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-grns", "rtu-materials", "rtu-purchases"})
	ctx.JSON(http.StatusCreated, gin.H{"success": true, "data": grn})
}

func (c *RTUGRNController) ConfirmGRN(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid GRN ID"})
		return
	}

	var confirmedBy uuid.UUID
	if userID, exists := ctx.Get("userID"); exists {
		if u, ok := userID.(uuid.UUID); ok {
			confirmedBy = u
		} else if uStr, ok := userID.(string); ok {
			confirmedBy, _ = uuid.Parse(uStr)
		}
	}

	if err := c.grnService.ConfirmGRN(ctx.Request.Context(), id, confirmedBy); err != nil {
		logger.Log.Error("Failed to confirm GRN", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-grns", "rtu-grn-" + idParam, "rtu-materials"})
	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "GRN confirmed successfully"})
}

type CancelGRNReq struct {
	Reason string `json:"reason"`
}

func (c *RTUGRNController) CancelGRN(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid GRN ID"})
		return
	}

	var req CancelGRNReq
	_ = ctx.ShouldBindJSON(&req)

	var cancelledBy uuid.UUID
	if userID, exists := ctx.Get("userID"); exists {
		if u, ok := userID.(uuid.UUID); ok {
			cancelledBy = u
		} else if uStr, ok := userID.(string); ok {
			cancelledBy, _ = uuid.Parse(uStr)
		}
	}

	if err := c.grnService.CancelGRN(ctx.Request.Context(), id, cancelledBy, req.Reason); err != nil {
		logger.Log.Error("Failed to cancel GRN", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-grns", "rtu-grn-" + idParam, "rtu-materials", "rtu-purchases"})
	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "GRN cancelled successfully"})
}

func (c *RTUGRNController) UpdateGRN(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID"})
		return
	}

	var input models.RTUGRN
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var updatedBy uuid.UUID
	if userID, exists := ctx.Get("userID"); exists {
		if u, ok := userID.(uuid.UUID); ok {
			updatedBy = u
		} else if uStr, ok := userID.(string); ok {
			updatedBy, _ = uuid.Parse(uStr)
		}
	}

	if err := c.grnService.UpdateGRN(ctx.Request.Context(), id, &input, updatedBy); err != nil {
		logger.Log.Error("Failed to update GRN/Invoice", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-grns", "rtu-grn-" + idParam})
	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "GRN/Invoice updated successfully"})
}
