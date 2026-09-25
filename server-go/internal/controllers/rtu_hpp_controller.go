package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/services"
)

func UpsertMonthlyHPP(ctx *gin.Context) {
	var input struct {
		OutletID          string  `json:"outletId" binding:"required"`
		MonthYear         string  `json:"monthYear" binding:"required"`
		TotalMaterialCost float64 `json:"totalMaterialCost"`
		TotalLaborCost    float64 `json:"totalLaborCost"`
		TotalOverheadCost float64 `json:"totalOverheadCost"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	outletUUID, err := uuid.Parse(input.OutletID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid outlet ID"})
		return
	}

	db := config.DB
	var hpp models.RTUMonthlyHPP
	
	var createdBy *uuid.UUID
	if uid, err := uuid.Parse(ctx.GetString("userID")); err == nil && uid != uuid.Nil {
		createdBy = &uid
	}

	err = db.Where("outlet_id = ? AND month_year = ?", outletUUID, input.MonthYear).First(&hpp).Error
	if err != nil {
		// Create new
		hpp = models.RTUMonthlyHPP{
			OutletID:          outletUUID,
			MonthYear:         input.MonthYear,
			TotalMaterialCost: input.TotalMaterialCost,
			TotalLaborCost:    input.TotalLaborCost,
			TotalOverheadCost: input.TotalOverheadCost,
			CreatedBy:         createdBy,
		}
		if err := db.Create(&hpp).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
			return
		}

		history := models.RTUMonthlyHPPHistory{
			MonthlyHPPID:      hpp.ID,
			Action:            "Created HPP Setting",
			TotalMaterialCost: input.TotalMaterialCost,
			TotalLaborCost:    input.TotalLaborCost,
			TotalOverheadCost: input.TotalOverheadCost,
			CreatedBy:         createdBy,
		}
		db.Create(&history)
	} else {
		// Update
		hpp.TotalMaterialCost = input.TotalMaterialCost
		hpp.TotalLaborCost = input.TotalLaborCost
		hpp.TotalOverheadCost = input.TotalOverheadCost
		hpp.UpdatedBy = createdBy
		if err := db.Save(&hpp).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
			return
		}

		history := models.RTUMonthlyHPPHistory{
			MonthlyHPPID:      hpp.ID,
			Action:            "Updated HPP Setting",
			TotalMaterialCost: input.TotalMaterialCost,
			TotalLaborCost:    input.TotalLaborCost,
			TotalOverheadCost: input.TotalOverheadCost,
			CreatedBy:         createdBy,
		}
		db.Create(&history)
	}

	// Recalculate all batches for this month
	batchRepo := repositories.NewRTUProductionBatchRepository(db)
	batchService := services.NewRTUProductionBatchService(db, batchRepo)
	if err := batchService.RecalculateHPPForMonth(ctx.Request.Context(), outletUUID, input.MonthYear, hpp); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to recalculate batches: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": hpp})
}

func GetAllMonthlyHPP(ctx *gin.Context) {
	outletID := ctx.Query("outletId")
	year := ctx.Query("year")

	if outletID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "outletId is required"})
		return
	}

	db := config.DB
	var hpps []models.RTUMonthlyHPP
	
	query := db.Preload("Creator").Preload("Histories").Preload("Histories.User").Where("outlet_id = ?", outletID)
	if year != "" {
		query = query.Where("month_year LIKE ?", year+"-%")
	}

	err := query.Order("month_year desc").Find(&hpps).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch HPPs: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": hpps})
}

func GetMonthlyHPP(ctx *gin.Context) {
	outletID := ctx.Query("outletId")
	monthYear := ctx.Query("monthYear")

	if outletID == "" || monthYear == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "outletId and monthYear are required"})
		return
	}

	db := config.DB
	var hpp models.RTUMonthlyHPP
	err := db.Where("outlet_id = ? AND month_year = ?", outletID, monthYear).First(&hpp).Error
	if err != nil {
		ctx.JSON(http.StatusOK, gin.H{"success": true, "data": nil})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": hpp})
}

func GetHPPMatrix(ctx *gin.Context) {
	year := ctx.Query("year")
	if year == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "year is required"})
		return
	}

	db := config.DB
	var hpps []models.RTUMonthlyHPP
	
	// Fetch all HPPs for the given year using LIKE
	err := db.Preload("Outlet").Preload("Creator").Preload("Histories").Preload("Histories.User").Where("month_year LIKE ?", year+"-%").Find(&hpps).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch HPP matrix: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": hpps})
}
