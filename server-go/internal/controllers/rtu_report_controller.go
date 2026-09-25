package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/internal/services"
)

type RTUReportController struct {
	reportService services.RTUReportService
}

func NewRTUReportController(reportService services.RTUReportService) *RTUReportController {
	return &RTUReportController{reportService: reportService}
}

func (ctrl *RTUReportController) GetDashboardSummary(c *gin.Context) {
	outletID := c.Query("outletId")
	month := c.Query("month")

	data, err := ctrl.reportService.GetDashboardSummary(c.Request.Context(), outletID, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}
