package controllers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/utils"
	"github.com/yourusername/kpi-backend/internal/websocket"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

type OutletController struct {
	outletRepo *repositories.OutletRepository
	hub        *websocket.Hub
}

func NewOutletController(outletRepo *repositories.OutletRepository, hub *websocket.Hub) *OutletController {
	return &OutletController{
		outletRepo: outletRepo,
		hub:        hub,
	}
}

// GetOutlets godoc
func (c *OutletController) GetOutlets(ctx *gin.Context) {
	offset := utils.ParseInt64(ctx.Query("offset"), 0)
	limit := utils.ParseInt64(ctx.Query("limit"), 10)
	search := strings.TrimSpace(ctx.Query("search"))
	isDeleted := ctx.Query("isDeleted") == "true"
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)

	ignoreAccess := ctx.Query("ignoreAccess") == "true"

	// Fetch user to check access permissions
	var user models.User
	if err := c.outletRepo.GetDB().WithContext(ctx.Request.Context()).Where("id = ? AND is_deleted = false", userID).First(&user).Error; err != nil {
		logger.Log.Error("Unauthorized access attempt or user not found", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var allowedOutletIDs []uuid.UUID
	// Super Admin can see all outlets
	if user.Role != "super admin" && !ignoreAccess {
		switch user.OutletAccessMode {
		case "single":
			if user.OutletID != nil {
				allowedOutletIDs = append(allowedOutletIDs, *user.OutletID)
			} else {
				// No results if single mode but no outlet ID
				ctx.JSON(http.StatusOK, gin.H{
					"success":    true,
					"message":    "Outlets retrieved successfully",
					"data":       []*models.Outlet{},
					"total":      0,
					"totalPages": 0,
				})
				return
			}
		case "multiple":
			allowedOutletIDs = user.OutletAccess.Val
			if len(allowedOutletIDs) == 0 {
				// No results if multiple mode but no IDs
				ctx.JSON(http.StatusOK, gin.H{
					"success":    true,
					"message":    "Outlets retrieved successfully",
					"data":       []*models.Outlet{},
					"total":      0,
					"totalPages": 0,
				})
				return
			}
		case "all":
			// No restriction
		}
	}

	sortBy := ctx.Query("sortBy")
	sortDesc := ctx.Query("desc") == "true"
	
	// Default sorting: region DESC, created_at ASC (matching user expectation)
	orderBy := ""
	if sortBy != "" {
		direction := "ASC"
		if sortDesc {
			direction = "DESC"
		}
		// Map frontend field to DB column
		column := sortBy
		if sortBy == "label" {
			column = "label"
		} else if sortBy == "region" {
			column = "region"
		} else if sortBy == "createdAt" {
			column = "created_at"
		}
		orderBy = column + " " + direction
	} else {
		// Default multi-sort
		orderBy = "region DESC, created_at ASC"
	}

	outlets, total, err := c.outletRepo.List(ctx.Request.Context(), search, offset, limit, isDeleted, allowedOutletIDs, orderBy)
	if err != nil {
		logger.Log.Error("Failed to get outlets", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to retrieve outlets")
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Outlets retrieved successfully",
		"data":       outlets,
		"total":      total,
		"totalPages": (total + limit - 1) / limit,
	})
}

// GetOutlet godoc
func (c *OutletController) GetOutlet(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid outlet ID")
		return
	}
	
	outlet, err := c.outletRepo.FindByID(ctx.Request.Context(), id)
	if err != nil {
		logger.Log.Error("Failed to get outlet", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to retrieve outlet")
		return
	}
	
	if outlet == nil {
		utils.ErrorResponse(ctx, http.StatusNotFound, "Outlet not found")
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Outlet retrieved successfully",
		"data":    outlet,
	})
}

// CreateOutletRequest
type CreateOutletRequest struct {
	Name                    string  `json:"name" binding:"required"`
	Label                   string  `json:"label" binding:"required"`
	Type                    string  `json:"type" binding:"required"`
	Address                 *string `json:"address"`
	SubDistrict             *string `json:"subDistrict"`
	District                *string `json:"district"`
	City                    *string `json:"city"`
	Region                  *string `json:"region"`
	State                   *string `json:"state"`
	TotalEmployees          *int    `json:"totalEmployees"`
	TotalPermanentEmployees *int    `json:"totalPermanentEmployees"`
	TotalProbationEmployees *int    `json:"totalProbationEmployees"`
	TotalMen                *int    `json:"totalMen"`
	TotalWomen              *int    `json:"totalWomen"`
	Abbreviation            *string `json:"abbreviation"`
	Image                   *string `json:"image"`
	TotalShiftPerDay        int     `json:"totalShiftPerDay"`
}

// AddOutlet godoc
func (c *OutletController) AddOutlet(ctx *gin.Context) {
	var req CreateOutletRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	
	outlet := &models.Outlet{
		Name:                    req.Name,
		Label:                   req.Label,
		Type:                    req.Type,
		Address:                 req.Address,
		SubDistrict:             req.SubDistrict,
		District:                req.District,
		City:                    req.City,
		Region:                  req.Region,
		State:                   req.State,
		TotalEmployees:          req.TotalEmployees,
		TotalPermanentEmployees: req.TotalPermanentEmployees,
		TotalProbationEmployees: req.TotalProbationEmployees,
		TotalMen:                req.TotalMen,
		TotalWomen:              req.TotalWomen,
		Abbreviation:            req.Abbreviation,
		Image:                   req.Image,
		TotalShiftPerDay:        req.TotalShiftPerDay,
	}
	
	err := c.outletRepo.Create(ctx.Request.Context(), outlet)
	if err != nil {
		logger.Log.Error("Failed to create outlet", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Duplicate outlet (name or label must be unique)")
		return
	}
	
	// Broadcast real-time update
	c.hub.Broadcast("invalidate_query", "outlet")
	
	ctx.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Outlet created successfully",
		"data":    outlet,
	})
}

// UpdateOutletRequest
type UpdateOutletRequest struct {
	Name                    string  `json:"name"`
	Label                   string  `json:"label"`
	Type                    string  `json:"type"`
	Address                 *string `json:"address"`
	SubDistrict             *string `json:"subDistrict"`
	District                *string `json:"district"`
	City                    *string `json:"city"`
	Region                  *string `json:"region"`
	State                   *string `json:"state"`
	TotalEmployees          *int    `json:"totalEmployees"`
	TotalPermanentEmployees *int    `json:"totalPermanentEmployees"`
	TotalProbationEmployees *int    `json:"totalProbationEmployees"`
	TotalMen                *int    `json:"totalMen"`
	TotalWomen              *int    `json:"totalWomen"`
	Abbreviation            *string `json:"abbreviation"`
	Image                   *string `json:"image"`
	TotalShiftPerDay        *int    `json:"totalShiftPerDay"`
}

// EditOutlet godoc
func (c *OutletController) EditOutlet(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid outlet ID")
		return
	}
	
	var req UpdateOutletRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}
	
	update := make(map[string]any)
	if req.Name != "" { update["name"] = req.Name }
	if req.Label != "" { update["label"] = req.Label }
	if req.Type != "" { update["type"] = req.Type }
	if req.Address != nil { update["address"] = req.Address }
	if req.SubDistrict != nil { update["sub_district"] = req.SubDistrict }
	if req.District != nil { update["district"] = req.District }
	if req.City != nil { update["city"] = req.City }
	if req.Region != nil { update["region"] = req.Region }
	if req.State != nil { update["state"] = req.State }
	if req.TotalEmployees != nil { update["total_employees"] = req.TotalEmployees }
	if req.TotalPermanentEmployees != nil { update["total_permanent_employees"] = req.TotalPermanentEmployees }
	if req.TotalProbationEmployees != nil { update["total_probation_employees"] = req.TotalProbationEmployees }
	if req.TotalMen != nil { update["total_men"] = req.TotalMen }
	if req.TotalWomen != nil { update["total_women"] = req.TotalWomen }
	if req.Abbreviation != nil { update["abbreviation"] = req.Abbreviation }
	if req.Image != nil { update["image"] = req.Image }
	if req.TotalShiftPerDay != nil { update["total_shift_per_day"] = *req.TotalShiftPerDay }
	
	var userID *uuid.UUID
	if val, exists := ctx.Get("userID"); exists {
		uid := val.(uuid.UUID)
		userID = &uid
	}
	
	updatedOutlet, err := c.outletRepo.Update(ctx.Request.Context(), id, update, userID)
	if err != nil {
		logger.Log.Error("Failed to update outlet", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusNotFound, "Outlet not found")
		return
	}
	
	// Broadcast real-time update
	c.hub.Broadcast("invalidate_query", "outlet")
	
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Outlet updated successfully",
		"data":    updatedOutlet,
	})
}

// DeleteOutlet godoc
func (c *OutletController) DeleteOutlet(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid outlet ID")
		return
	}
	
	var userID *uuid.UUID
	if val, exists := ctx.Get("userID"); exists {
		uid := val.(uuid.UUID)
		userID = &uid
	}
	
	err = c.outletRepo.SoftDelete(ctx.Request.Context(), id, userID)
	if err != nil {
		logger.Log.Error("Failed to delete outlet", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusNotFound, "Outlet not found")
		return
	}
	
	// Broadcast real-time update
	c.hub.Broadcast("invalidate_query", "outlet")
	
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Outlet deleted successfully",
		"id":      id.String(),
	})
}

// RestoreOutlet godoc
func (c *OutletController) RestoreOutlet(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid outlet ID")
		return
	}
	
	var userID *uuid.UUID
	if val, exists := ctx.Get("userID"); exists {
		uid := val.(uuid.UUID)
		userID = &uid
	}
	
	restoredOutlet, err := c.outletRepo.Restore(ctx.Request.Context(), id, userID)
	if err != nil {
		logger.Log.Error("Failed to restore outlet", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusNotFound, "Outlet not found")
		return
	}
	
	// Broadcast real-time update
	c.hub.Broadcast("invalidate_query", "outlet")
	
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Outlet restored successfully",
		"data":    restoredOutlet,
	})
}
