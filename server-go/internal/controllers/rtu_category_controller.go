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

type RTUCategoryController struct {
	categoryRepo repositories.RTUCategoryRepository
	hub          *websocket.Hub
}

func NewRTUCategoryController(categoryRepo repositories.RTUCategoryRepository, hub *websocket.Hub) *RTUCategoryController {
	return &RTUCategoryController{
		categoryRepo: categoryRepo,
		hub:          hub,
	}
}

func (c *RTUCategoryController) GetCategories(ctx *gin.Context) {
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

	categories, err := c.categoryRepo.FindAll(ctx.Request.Context(), search, isActive, showDeleted)
	if err != nil {
		logger.Log.Error("Failed to fetch categories", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch categories"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    categories,
	})
}

func (c *RTUCategoryController) GetCategory(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid category ID format"})
		return
	}

	category, err := c.categoryRepo.FindByID(ctx.Request.Context(), id)
	if err != nil {
		logger.Log.Error("Failed to fetch category", zap.Error(err), zap.String("id", idParam))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch category details"})
		return
	}

	if category == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Category not found"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": category})
}

func (c *RTUCategoryController) CreateCategory(ctx *gin.Context) {
	var input struct {
		Name     string `json:"name" binding:"required"`
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

	category := &models.RTUCategory{
		Name:     input.Name,
		IsActive: isActive,
	}

	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		category.UpdatedBy = uPtr
	}

	if err := c.categoryRepo.Create(ctx.Request.Context(), category); err != nil {
		logger.Log.Error("Failed to create category", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create category"})
		return
	}

	// Realtime invalidate
	c.hub.Broadcast("invalidate_query", []string{"rtu-categories"})

	ctx.JSON(http.StatusCreated, gin.H{"success": true, "data": category})
}

func (c *RTUCategoryController) UpdateCategory(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid category ID"})
		return
	}

	var input struct {
		Name     string `json:"name" binding:"required"`
		IsActive bool   `json:"isActive"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	category, err := c.categoryRepo.FindByID(ctx.Request.Context(), id)
	if err != nil || category == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Category not found"})
		return
	}

	category.Name = input.Name
	category.IsActive = input.IsActive

	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		category.UpdatedBy = uPtr
	}

	if err := c.categoryRepo.Update(ctx.Request.Context(), category); err != nil {
		logger.Log.Error("Failed to update category", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to update category"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-categories", "rtu-category-" + idParam})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": category})
}

func (c *RTUCategoryController) DeleteCategory(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid category ID"})
		return
	}

	var deletedBy uuid.UUID
	if uPtr := getUserIDFromContext(ctx); uPtr != nil {
		deletedBy = *uPtr
	}

	if err := c.categoryRepo.Delete(ctx.Request.Context(), id, deletedBy); err != nil {
		logger.Log.Error("Failed to delete category", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to delete category"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-categories"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Category deleted successfully"})
}

func (c *RTUCategoryController) RestoreCategory(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid category ID"})
		return
	}

	if err := c.categoryRepo.Restore(ctx.Request.Context(), id); err != nil {
		logger.Log.Error("Failed to restore category", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to restore category"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-categories"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Category restored successfully"})
}

func (c *RTUCategoryController) HardDeleteCategory(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid category ID"})
		return
	}

	if err := c.categoryRepo.HardDelete(ctx.Request.Context(), id); err != nil {
		logger.Log.Error("Failed to permanently delete category", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to permanently delete category"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-categories"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Category permanently deleted successfully"})
}
