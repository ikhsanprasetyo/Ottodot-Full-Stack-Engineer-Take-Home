package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/services"
	"github.com/yourusername/kpi-backend/internal/websocket"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.mongodb.org/mongo-driver/bson"
	"go.uber.org/zap"
)

type RTUProductionBatchController struct {
	batchRepo    repositories.RTUProductionBatchRepository
	batchService services.RTUProductionBatchService
	hub          *websocket.Hub
}

func NewRTUProductionBatchController(batchRepo repositories.RTUProductionBatchRepository, batchService services.RTUProductionBatchService, hub *websocket.Hub) *RTUProductionBatchController {
	return &RTUProductionBatchController{
		batchRepo:    batchRepo,
		batchService: batchService,
		hub:          hub,
	}
}

func (c *RTUProductionBatchController) GetBatches(ctx *gin.Context) {
	status := ctx.Query("status")
	outletIDParam := ctx.Query("outlet_id")

	var outletIDPtr *uuid.UUID
	if outletIDParam != "" {
		if u, err := uuid.Parse(outletIDParam); err == nil {
			outletIDPtr = &u
		} else {
			ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid outlet_id format"})
			return
		}
	}

	batches, err := c.batchRepo.FindAll(ctx.Request.Context(), status, outletIDPtr)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch batches"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": batches})
}

func (c *RTUProductionBatchController) GetBatch(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Batch ID"})
		return
	}

	batch, err := c.batchRepo.FindByID(ctx.Request.Context(), id)
	if err != nil || batch == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Batch not found"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": batch})
}

func (c *RTUProductionBatchController) CreateBatch(ctx *gin.Context) {
	var batch models.RTUProductionBatch
	if err := ctx.ShouldBindJSON(&batch); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	var createdBy uuid.UUID
	userID, _ := ctx.Get("userID")
	if u, ok := userID.(uuid.UUID); ok {
		createdBy = u
	} else if userIDStr, ok := userID.(string); ok {
		createdBy, _ = uuid.Parse(userIDStr)
	}

	if err := c.batchService.CreateBatch(ctx.Request.Context(), &batch, createdBy); err != nil {
		logger.Log.Error("Failed to create Batch", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-batches"})
	ctx.JSON(http.StatusCreated, gin.H{"success": true, "data": batch})
}

func (c *RTUProductionBatchController) UpdateBatch(ctx *gin.Context) {
	idParam := ctx.Param("id")
	batchID, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid batch ID format"})
		return
	}

	var input models.RTUProductionBatch
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request body"})
		return
	}

	var updatedBy uuid.UUID
	userID, _ := ctx.Get("userID")
	if u, ok := userID.(uuid.UUID); ok {
		updatedBy = u
	} else if userIDStr, ok := userID.(string); ok {
		updatedBy, _ = uuid.Parse(userIDStr)
	}

	err = c.batchService.UpdateBatch(ctx.Request.Context(), batchID, &input, updatedBy)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to update batch"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-batches", "rtu-batch-" + idParam})
	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Production batch updated successfully"})
}

func (c *RTUProductionBatchController) StartBatch(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Batch ID"})
		return
	}

	var updatedBy uuid.UUID
	userID, _ := ctx.Get("userID")
	if u, ok := userID.(uuid.UUID); ok {
		updatedBy = u
	} else if userIDStr, ok := userID.(string); ok {
		updatedBy, _ = uuid.Parse(userIDStr)
	}

	if err := c.batchService.StartBatch(ctx.Request.Context(), id, updatedBy); err != nil {
		logger.Log.Error("Failed to start Batch", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-batches", "rtu-batch-" + idParam})
	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Batch started successfully"})
}

func (c *RTUProductionBatchController) CompleteBatch(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Batch ID"})
		return
	}

	var input models.RTUProductionBatch
	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	input.ID = id

	var completedBy uuid.UUID
	userID, _ := ctx.Get("userID")
	if u, ok := userID.(uuid.UUID); ok {
		completedBy = u
	} else if userIDStr, ok := userID.(string); ok {
		completedBy, _ = uuid.Parse(userIDStr)
	}

	if err := c.batchService.CompleteBatch(ctx.Request.Context(), &input, completedBy); err != nil {
		logger.Log.Error("Failed to complete Batch", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-batches", "rtu-batch-" + idParam})
	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Batch completed successfully"})
}

func (c *RTUProductionBatchController) DeleteBatch(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Batch ID"})
		return
	}

	var deletedBy uuid.UUID
	userID, _ := ctx.Get("userID")
	if u, ok := userID.(uuid.UUID); ok {
		deletedBy = u
	} else if userIDStr, ok := userID.(string); ok {
		deletedBy, _ = uuid.Parse(userIDStr)
	}

	if err := c.batchService.DeleteBatch(ctx.Request.Context(), id, deletedBy); err != nil {
		logger.Log.Error("Failed to delete Batch", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-batches", "rtu-batch-" + idParam})
	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Batch deleted successfully"})
}

func (c *RTUProductionBatchController) CancelBatch(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Batch ID"})
		return
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := ctx.ShouldBindJSON(&body); err != nil || len([]rune(body.Reason)) < 5 {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Alasan pembatalan wajib diisi minimal 5 karakter"})
		return
	}

	var cancelledBy uuid.UUID
	userID, _ := ctx.Get("userID")
	if u, ok := userID.(uuid.UUID); ok {
		cancelledBy = u
	} else if userIDStr, ok := userID.(string); ok {
		cancelledBy, _ = uuid.Parse(userIDStr)
	}

	if err := c.batchService.CancelBatch(ctx.Request.Context(), id, cancelledBy, body.Reason); err != nil {
		logger.Log.Error("Failed to cancel Batch", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-batches", "rtu-batch-" + idParam})
	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Batch cancelled successfully"})
}

func (c *RTUProductionBatchController) GetHRISPositions(ctx *gin.Context) {
	if config.HRISMongoDB == nil {
		ctx.JSON(http.StatusOK, gin.H{"success": true, "data": []gin.H{}})
		return
	}

	coll := config.HRISMongoDB.Collection("positions")
	cursor, err := coll.Find(ctx.Request.Context(), bson.M{})
	if err != nil {
		logger.Log.Error("Failed to fetch positions from HRIS Mongo", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch positions from HRIS"})
		return
	}
	defer cursor.Close(ctx.Request.Context())

	var results []bson.M
	if err := cursor.All(ctx.Request.Context(), &results); err != nil {
		logger.Log.Error("Failed to decode positions from HRIS Mongo", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to decode positions"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}
