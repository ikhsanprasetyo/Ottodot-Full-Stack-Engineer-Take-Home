package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/services"
)

type RTUStockLedgerController struct {
	repo    repositories.RTUStockLedgerRepository
	service services.RTUStockLedgerService
}

func NewRTUStockLedgerController(repo repositories.RTUStockLedgerRepository, service services.RTUStockLedgerService) *RTUStockLedgerController {
	return &RTUStockLedgerController{repo: repo, service: service}
}

func (ctrl *RTUStockLedgerController) GetAll(c *gin.Context) {
	filter := make(map[string]interface{})
	if materialID := c.Query("materialId"); materialID != "" {
		filter["materialId"] = materialID
	}
	if movementType := c.Query("movementType"); movementType != "" {
		filter["movementType"] = movementType
	}
	if outletID := c.Query("outletId"); outletID != "" {
		filter["outletId"] = outletID
	}
	if month := c.Query("month"); month != "" {
		filter["month"] = month
	}

	ledgers, err := ctrl.service.GetAll(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": ledgers})
}
