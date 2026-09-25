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

type RTUPurchaseController struct {
	purchaseRepo    repositories.RTUPurchaseRepository
	purchaseService services.RTUPurchaseService
	hub             *websocket.Hub
}

func NewRTUPurchaseController(purchaseRepo repositories.RTUPurchaseRepository, purchaseService services.RTUPurchaseService, hub *websocket.Hub) *RTUPurchaseController {
	return &RTUPurchaseController{
		purchaseRepo:    purchaseRepo,
		purchaseService: purchaseService,
		hub:             hub,
	}
}

// GET /rtu/purchase/all?buyerId=&sellerId=&vendorId=&status=&type=
func (ctrl *RTUPurchaseController) GetPurchases(c *gin.Context) {
	var buyerID, sellerID, vendorID *uuid.UUID

	if v := c.Query("buyerId"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid buyerId"})
			return
		}
		buyerID = &id
	}
	if v := c.Query("sellerId"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid sellerId"})
			return
		}
		sellerID = &id
	}
	if v := c.Query("vendorId"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid vendorId"})
			return
		}
		vendorID = &id
	}

	status := c.Query("status")
	purchaseType := c.Query("type")

	purchases, err := ctrl.purchaseRepo.FindAll(c.Request.Context(), buyerID, sellerID, vendorID, status, purchaseType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": purchases})
}

// GET /rtu/purchase/:id
func (ctrl *RTUPurchaseController) GetPurchase(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Purchase ID"})
		return
	}

	purchase, err := ctrl.purchaseRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if purchase == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Purchase order not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": purchase})
}

// POST /rtu/purchase
func (ctrl *RTUPurchaseController) CreatePurchase(c *gin.Context) {
	var purchase models.RTUPurchase
	if err := c.ShouldBindJSON(&purchase); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	if purchase.SellerID == nil && purchase.VendorID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Either sellerId or vendorId must be provided"})
		return
	}

	userIDString, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "unauthorized"})
		return
	}
	var userID uuid.UUID
	if u, ok := userIDString.(uuid.UUID); ok {
		userID = u
	} else if uStr, ok := userIDString.(string); ok {
		parsed, err := uuid.Parse(uStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "invalid user id string format"})
			return
		}
		userID = parsed
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "invalid user id type"})
		return
	}

	if err := ctrl.purchaseService.CreatePurchase(c.Request.Context(), &purchase, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Auto process so it skips DRAFT and goes straight to PROCESSING.
	// We DO NOT auto-receive here, so the user can still create a GRN manually to receive the goods.
	if err := ctrl.purchaseService.ProcessPurchase(c.Request.Context(), purchase.ID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Auto-process failed: " + err.Error()})
		return
	}

	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-purchases"})
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": purchase})
}

// POST /rtu/purchase/process/:id
func (ctrl *RTUPurchaseController) ProcessPurchase(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Purchase ID"})
		return
	}

	userIDRaw, _ := c.Get("userID")
	var userID uuid.UUID
	if u, ok := userIDRaw.(uuid.UUID); ok {
		userID = u
	} else if uStr, ok := userIDRaw.(string); ok {
		userID, _ = uuid.Parse(uStr)
	}

	if err := ctrl.purchaseService.ProcessPurchase(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-purchases", "rtu-purchase-" + idParam})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Purchase order processed and seller stock deducted"})
}

// POST /rtu/purchase/receive/:id
func (ctrl *RTUPurchaseController) ReceivePurchase(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Purchase ID"})
		return
	}

	userIDRaw, _ := c.Get("userID")
	var userID uuid.UUID
	if u, ok := userIDRaw.(uuid.UUID); ok {
		userID = u
	} else if uStr, ok := userIDRaw.(string); ok {
		userID, _ = uuid.Parse(uStr)
	}

	if err := ctrl.purchaseService.ReceivePurchase(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-purchases", "rtu-purchase-" + idParam})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Purchase order received and buyer stock updated"})
}

// POST /rtu/purchase/cancel/:id
func (ctrl *RTUPurchaseController) CancelPurchase(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid Purchase ID"})
		return
	}

	userIDRaw, _ := c.Get("userID")
	var userID uuid.UUID
	if u, ok := userIDRaw.(uuid.UUID); ok {
		userID = u
	} else if uStr, ok := userIDRaw.(string); ok {
		userID, _ = uuid.Parse(uStr)
	}

	if err := ctrl.purchaseService.CancelPurchase(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-purchases", "rtu-purchase-" + idParam})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Purchase order cancelled"})
}
