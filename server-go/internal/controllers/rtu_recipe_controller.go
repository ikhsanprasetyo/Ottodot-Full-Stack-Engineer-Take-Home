package controllers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/websocket"
)

type RTURecipeController struct {
	recipeRepo  repositories.RTURecipeRepository
	hub         *websocket.Hub
}

func NewRTURecipeController(recipeRepo repositories.RTURecipeRepository, hub *websocket.Hub) *RTURecipeController {
	return &RTURecipeController{
		recipeRepo: recipeRepo,
		hub:        hub,
	}
}

// 1. Get entire recipe tree for a product
func (c *RTURecipeController) GetRecipeByProduct(ctx *gin.Context) {
	productID := ctx.Param("id")

	id, err := uuid.Parse(productID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Product ID"})
		return
	}

	recipe, err := c.recipeRepo.GetRecipeByProductID(ctx.Request.Context(), id.String())
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to get recipe"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": recipe})
}

// 2. Draft a new Version (Builder step 1)
func (c *RTURecipeController) DraftVersion(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Product ID"})
		return
	}

	// Ensure Recipe container exists for this product
	recipe, err := c.recipeRepo.GetRecipeByProductID(ctx.Request.Context(), id.String())
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Database error"})
		return
	}
	if recipe == nil {
		// Auto create master recipe if it doesnt exist
		recipe = &models.RTURecipe{ProductID: id}
		if err := c.recipeRepo.CreateRecipe(ctx.Request.Context(), recipe); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to init recipe container"})
			return
		}
	}

	var input struct {
		VersionNumber  string `json:"versionNumber" binding:"required"`
		ExpectedOutput float64 `json:"expectedOutput" binding:"required"`
		Notes          string `json:"notes"`
		Ingredients    []struct {
			MaterialID             string   `json:"materialId" binding:"required"`
			AlternativeMaterialIds []string `json:"alternativeMaterialIds"`
			Qty                    float64  `json:"qty" binding:"required"`
			Unit                   string   `json:"unit" binding:"required"`
		} `json:"ingredients" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&input); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid input: " + err.Error()})
		return
	}

	var createdBy *uuid.UUID
	if userID, exists := ctx.Get("userID"); exists {
		if userIDStr, ok := userID.(string); ok {
			if id, err := uuid.Parse(userIDStr); err == nil {
				createdBy = &id
			}
		}
	}

	version := &models.RTURecipeVersion{
		RecipeID:       recipe.ID,
		VersionNumber:  input.VersionNumber,
		Status:         models.RecipeStatusDraft,
		Notes:          input.Notes,
		ExpectedOutput: input.ExpectedOutput,
		CreatedBy:      createdBy,
	}

	for _, ing := range input.Ingredients {
		mID, err := uuid.Parse(ing.MaterialID)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Material ID: " + ing.MaterialID})
			return
		}
		altIDs := ing.AlternativeMaterialIds
		if altIDs == nil {
			altIDs = []string{}
		}
		version.Ingredients = append(version.Ingredients, models.RTURecipeIngredient{
			MaterialID:             mID,
			AlternativeMaterialIDs: altIDs,
			Qty:                    ing.Qty,
			Unit:                   ing.Unit,
		})
	}

	if err := c.recipeRepo.CreateVersion(ctx.Request.Context(), version); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": fmt.Sprintf("Failed to draft version: %v", err)})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-recipes"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": version})
}

// 3. Activate a Version
func (c *RTURecipeController) ActivateVersion(ctx *gin.Context) {
	recipeID := ctx.Param("id")
	versionID := ctx.Param("versionId")

	if err := c.recipeRepo.ActivateVersion(ctx.Request.Context(), recipeID, versionID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to activate version"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-recipes", "rtu-products"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Version successfully activated"})
}

// 4. Delete a draft version
func (c *RTURecipeController) DeleteVersion(ctx *gin.Context) {
	versionID := ctx.Param("versionId")

	if err := c.recipeRepo.DeleteDraftVersion(ctx.Request.Context(), versionID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Failed to delete: Version may not be a draft or does not exist"})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-recipes"})

	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Draft version deleted"})
}
