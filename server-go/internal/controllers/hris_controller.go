package controllers

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/services"
)

type HRISController struct {
	hrisService services.HRISService
}

func NewHRISController(hrisService services.HRISService) *HRISController {
	return &HRISController{hrisService: hrisService}
}

func (c *HRISController) GetHRISDetails(ctx *gin.Context) {
	outletIDStr := ctx.Query("outletId")
	month := ctx.Query("month")
	year := ctx.Query("year")

	if outletIDStr == "" || month == "" || year == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "outletId, month, and year are required",
		})
		return
	}

	outletID, err := uuid.Parse(outletIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid outletId format",
		})
		return
	}

	monthInt, _ := strconv.Atoi(month)
	yearInt, _ := strconv.Atoi(year)

	details, err := c.hrisService.GetHRISOperationsDetails(context.Background(), outletID, monthInt, yearInt)
	if err != nil {
		log.Printf("[HRISController] ERROR: %v", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    details,
	})
}
