package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/services"
	"github.com/yourusername/kpi-backend/internal/websocket"
)

type RTUDistributionController struct {
	distRepo    repositories.RTUDistributionRepository
	distService services.RTUDistributionService
	hub         *websocket.Hub
}

func NewRTUDistributionController(distRepo repositories.RTUDistributionRepository, distService services.RTUDistributionService, hub *websocket.Hub) *RTUDistributionController {
	return &RTUDistributionController{
		distRepo:    distRepo,
		distService: distService,
		hub:         hub,
	}
}

func (ctrl *RTUDistributionController) GetDistributions(c *gin.Context) {
	outletIDStr := c.Query("outletId")
	if outletIDStr != "" {
		outletID, err := uuid.Parse(outletIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid outlet ID"})
			return
		}
		dists, err := ctrl.distRepo.FindAllByOutlet(c.Request.Context(), outletID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": dists})
		return
	}

	dists, err := ctrl.distRepo.FindAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": dists})
}

func (ctrl *RTUDistributionController) GetDistribution(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Distribution ID"})
		return
	}

	dist, err := ctrl.distRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if dist == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Distribution not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": dist})
}

func (ctrl *RTUDistributionController) CreateDistribution(c *gin.Context) {
	var dist models.RTUDistribution
	if err := c.ShouldBindJSON(&dist); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	userIDAny, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "unauthorized"})
		return
	}
	userID, ok := userIDAny.(uuid.UUID)
	if !ok {
		if idStr, isStr := userIDAny.(string); isStr {
			userID, _ = uuid.Parse(idStr)
		}
	}

	if err := ctrl.distService.CreateDistribution(c.Request.Context(), &dist, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-distributions"})
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": dist})
}

func (ctrl *RTUDistributionController) UpdateDistribution(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Distribution ID"})
		return
	}

	var dist models.RTUDistribution
	if err := c.ShouldBindJSON(&dist); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	userIDAny, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "unauthorized"})
		return
	}
	userID, ok := userIDAny.(uuid.UUID)
	if !ok {
		if idStr, isStr := userIDAny.(string); isStr {
			userID, _ = uuid.Parse(idStr)
		}
	}

	if err := ctrl.distService.UpdateDistribution(c.Request.Context(), id, &dist, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-distributions", "rtu-distribution-" + idParam})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Distribution updated successfully"})
}

func (ctrl *RTUDistributionController) ShipDistribution(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Distribution ID"})
		return
	}

	userIDAny, _ := c.Get("userID")
	userID, ok := userIDAny.(uuid.UUID)
	if !ok {
		if idStr, isStr := userIDAny.(string); isStr {
			userID, _ = uuid.Parse(idStr)
		}
	}

	if err := ctrl.distService.ShipDistribution(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-distributions", "rtu-distribution-" + idParam, "rtu-products"})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Distribution shipped successfully"})
}

func (ctrl *RTUDistributionController) ReceiveDistribution(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Distribution ID"})
		return
	}

	userIDAny, _ := c.Get("userID")
	userID, ok := userIDAny.(uuid.UUID)
	if !ok {
		if idStr, isStr := userIDAny.(string); isStr {
			userID, _ = uuid.Parse(idStr)
		}
	}

	if err := ctrl.distService.ReceiveDistribution(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-distributions", "rtu-distribution-" + idParam})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Distribution received successfully"})
}

func (ctrl *RTUDistributionController) CancelDistribution(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Distribution ID"})
		return
	}

	userIDAny, _ := c.Get("userID")
	userID, ok := userIDAny.(uuid.UUID)
	if !ok {
		if idStr, isStr := userIDAny.(string); isStr {
			userID, _ = uuid.Parse(idStr)
		}
	}

	if err := ctrl.distService.CancelDistribution(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-distributions", "rtu-distribution-" + idParam})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Distribution cancelled successfully"})
}
