package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/websocket"
)

type OttodotController struct {
	repo *repositories.OttodotRepository
}

func NewOttodotController() *OttodotController {
	return &OttodotController{
		repo: repositories.NewOttodotRepository(config.DB),
	}
}

// GetClasses returns all trial classes with dynamic remaining seat calculation
func (ctrl *OttodotController) GetClasses(c *gin.Context) {
	classes, err := ctrl.repo.GetAllClasses()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	type ClassDTO struct {
		models.TrialClass
		RemainingSeats int  `json:"remaining_seats"`
		IsFull         bool `json:"is_full"`
	}

	dtos := make([]ClassDTO, 0, len(classes))
	for _, cls := range classes {
		rem := cls.Capacity - cls.EnrolledCount
		if rem < 0 {
			rem = 0
		}
		dtos = append(dtos, ClassDTO{
			TrialClass:     cls,
			RemainingSeats: rem,
			IsFull:         rem == 0,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    dtos,
	})
}

// CreateBooking creates a pending booking
func (ctrl *OttodotController) CreateBooking(c *gin.Context) {
	var req models.CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid payload: student_id and trial_class_id are required"})
		return
	}

	booking, err := ctrl.repo.CreateBooking(req.StudentID, req.TrialClassID)
	if err != nil {
		if err.Error() == "DUPLICATE_CONFIRMED_BOOKING: Child already has a confirmed booking for this class" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"success":    false,
				"error_code": "DUPLICATE_CONFIRMED_BOOKING",
				"message":    "Child already has a confirmed booking for this trial class.",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    booking,
	})
}

// ProcessPayment handles mock payment and resolves last-seat race condition
func (ctrl *OttodotController) ProcessPayment(c *gin.Context) {
	var req models.ProcessPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid payment payload"})
		return
	}

	booking, attempt, err := ctrl.repo.ProcessPaymentTransaction(req.BookingID, req.SimulateOutcome)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// Broadcast WebSocket update for seat counters and roster changes
	websocket.GlobalHub.Broadcast("SEAT_UPDATE", gin.H{
		"class_id":       booking.TrialClassID,
		"booking_status": booking.Status,
	})

	if booking.Status == models.BookingStatusConfirmed {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Trial class booking confirmed successfully!",
			"data": gin.H{
				"booking": booking,
				"payment": attempt,
			},
		})
		return
	}

	// Status is payment_failed
	c.JSON(http.StatusConflict, gin.H{
		"success":    false,
		"error_code": attempt.FailureReason,
		"message":    attempt.FailureReason,
		"data": gin.H{
			"booking": booking,
			"payment": attempt,
		},
	})
}

// UpdateClassCapacity allows Admins to edit class properties & student capacity limit dynamically
func (ctrl *OttodotController) UpdateClassCapacity(c *gin.Context) {
	idStr := c.Param("id")
	classID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid class ID"})
		return
	}

	var req models.UpdateClassCapacityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	updatedClass, err := ctrl.repo.UpdateClass(classID, req)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"success": false, "error": err.Error()})
		return
	}

	// Broadcast WebSocket update
	websocket.GlobalHub.Broadcast("SEAT_UPDATE", gin.H{
		"class_id": updatedClass.ID,
		"action":   "CAPACITY_UPDATED",
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Class capacity updated successfully!",
		"data":    updatedClass,
	})
}

// GetClassRoster returns list of confirmed students for Teacher/Admin roster view
func (ctrl *OttodotController) GetClassRoster(c *gin.Context) {
	idStr := c.Param("id")
	classID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid class ID"})
		return
	}

	class, bookings, err := ctrl.repo.GetClassRoster(classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"class":    class,
			"roster":   bookings,
			"count":    len(bookings),
			"capacity": class.Capacity,
		},
	})
}

// GetParentsAndStudents returns synthetic dataset for selector UI
func (ctrl *OttodotController) GetParentsAndStudents(c *gin.Context) {
	parents, err := ctrl.repo.GetParentsAndStudents()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    parents,
	})
}
