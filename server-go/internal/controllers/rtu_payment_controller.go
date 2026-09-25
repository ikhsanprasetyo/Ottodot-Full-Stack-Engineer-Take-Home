package controllers

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/services"
	"github.com/yourusername/kpi-backend/internal/websocket"
)

type RTUPaymentController struct {
	paymentService services.RTUPaymentService
	hub            *websocket.Hub
}

func NewRTUPaymentController(paymentService services.RTUPaymentService, hub *websocket.Hub) *RTUPaymentController {
	return &RTUPaymentController{
		paymentService: paymentService,
		hub:            hub,
	}
}

func (ctrl *RTUPaymentController) CreatePayment(c *gin.Context) {
	var req services.CreatePaymentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	userIDRaw, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "unauthorized"})
		return
	}
	userID, ok := userIDRaw.(uuid.UUID)
	if !ok {
		if idStr, isStr := userIDRaw.(string); isStr {
			userID, _ = uuid.Parse(idStr)
		}
	}

	payment, err := ctrl.paymentService.CreatePayment(c.Request.Context(), &req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": payment})
	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-payments", "rtu-purchases"})
}

func (ctrl *RTUPaymentController) GetPayments(c *gin.Context) {
	var buyerID, vendorID, sellerID *uuid.UUID
	
	if id := c.Query("buyerId"); id != "" {
		if parsed, err := uuid.Parse(id); err == nil {
			buyerID = &parsed
		}
	}
	if id := c.Query("vendorId"); id != "" {
		if parsed, err := uuid.Parse(id); err == nil {
			vendorID = &parsed
		}
	}
	if id := c.Query("sellerId"); id != "" {
		if parsed, err := uuid.Parse(id); err == nil {
			sellerID = &parsed
		}
	}
	status := c.Query("status")

	payments, err := ctrl.paymentService.GetPayments(c.Request.Context(), buyerID, vendorID, sellerID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": payments})
}

func (ctrl *RTUPaymentController) GetPaymentByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid id format"})
		return
	}

	payment, err := ctrl.paymentService.GetPaymentByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "payment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": payment})
}

func (ctrl *RTUPaymentController) CompletePayment(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid id format"})
		return
	}

	userIDRaw, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "unauthorized"})
		return
	}
	userID, ok := userIDRaw.(uuid.UUID)
	if !ok {
		if idStr, isStr := userIDRaw.(string); isStr {
			userID, _ = uuid.Parse(idStr)
		}
	}

	if err := ctrl.paymentService.CompletePayment(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "payment completed successfully"})
	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-payments", "rtu-purchases"})
}

type CancelPaymentReq struct {
	Reason string `json:"reason"`
}

func (ctrl *RTUPaymentController) CancelPayment(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid id format"})
		return
	}

	var req CancelPaymentReq
	_ = c.ShouldBindJSON(&req)

	trimmedReason := strings.TrimSpace(req.Reason)
	if utf8.RuneCountInString(trimmedReason) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Alasan pembatalan wajib diisi minimal 6 karakter"})
		return
	}

	userIDRaw, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "unauthorized"})
		return
	}
	userID, ok := userIDRaw.(uuid.UUID)
	if !ok {
		if idStr, isStr := userIDRaw.(string); isStr {
			userID, _ = uuid.Parse(idStr)
		}
	}

	if err := ctrl.paymentService.CancelPayment(c.Request.Context(), id, userID, trimmedReason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "payment cancelled successfully"})
	ctrl.hub.Broadcast("invalidate_query", []string{"rtu-payments", "rtu-purchases"})
}

func (ctrl *RTUPaymentController) GetRTUBanks(c *gin.Context) {
	banks, err := ctrl.paymentService.GetBanks(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": banks})
}
