package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/services"
	"github.com/yourusername/kpi-backend/internal/websocket"
)

type RTUInvoiceReconcileController struct {
	invoiceService services.RTUInvoiceReconcileService
	hub            *websocket.Hub
}

func NewRTUInvoiceReconcileController(invoiceService services.RTUInvoiceReconcileService, hub *websocket.Hub) *RTUInvoiceReconcileController {
	return &RTUInvoiceReconcileController{invoiceService: invoiceService, hub: hub}
}

func (c *RTUInvoiceReconcileController) GetInvoices(ctx *gin.Context) {
	purchaseIDStr := ctx.Query("purchaseId")
	status := ctx.Query("status")

	var purchaseID *uuid.UUID
	if purchaseIDStr != "" {
		parsed, err := uuid.Parse(purchaseIDStr)
		if err == nil {
			purchaseID = &parsed
		}
	}

	invoices, err := c.invoiceService.GetAll(ctx.Request.Context(), purchaseID, status)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch invoices"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": invoices})
}

func (c *RTUInvoiceReconcileController) GetInvoice(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid invoice ID"})
		return
	}

	invoice, err := c.invoiceService.GetByID(ctx.Request.Context(), id)
	if err != nil || invoice == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Invoice not found"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"success": true, "data": invoice})
}

func (c *RTUInvoiceReconcileController) CreateInvoice(ctx *gin.Context) {
	var req services.CreateInvoiceReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	userID := c.getUserID(ctx)
	invoice, err := c.invoiceService.CreateInvoice(ctx.Request.Context(), &req, userID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-invoice-reconciles", "rtu-grns"})
	ctx.JSON(http.StatusCreated, gin.H{"success": true, "data": invoice})
}

func (c *RTUInvoiceReconcileController) UpdateInvoice(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid invoice ID"})
		return
	}

	var req services.UpdateInvoiceReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	userID := c.getUserID(ctx)
	if err := c.invoiceService.UpdateInvoice(ctx.Request.Context(), id, &req, userID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-invoice-reconciles"})
	ctx.JSON(http.StatusOK, gin.H{"success": true})
}

func (c *RTUInvoiceReconcileController) ConfirmInvoice(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid invoice ID"})
		return
	}

	userID := c.getUserID(ctx)
	if err := c.invoiceService.ConfirmInvoice(ctx.Request.Context(), id, userID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-invoice-reconciles", "rtu-purchases"})
	ctx.JSON(http.StatusOK, gin.H{"success": true})
}

type CancelInvoiceReq struct {
	Reason string `json:"reason"`
}

func (c *RTUInvoiceReconcileController) CancelInvoice(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid invoice ID"})
		return
	}

	var req CancelInvoiceReq
	_ = ctx.ShouldBindJSON(&req)

	userID := c.getUserID(ctx)
	if err := c.invoiceService.CancelInvoice(ctx.Request.Context(), id, userID, req.Reason); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.hub.Broadcast("invalidate_query", []string{"rtu-invoice-reconciles"})
	ctx.JSON(http.StatusOK, gin.H{"success": true})
}

func (c *RTUInvoiceReconcileController) getUserID(ctx *gin.Context) uuid.UUID {
	var userID uuid.UUID
	if v, exists := ctx.Get("userID"); exists {
		if u, ok := v.(uuid.UUID); ok {
			userID = u
		} else if s, ok := v.(string); ok {
			userID, _ = uuid.Parse(s)
		}
	}
	return userID
}
