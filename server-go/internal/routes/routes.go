package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/internal/controllers"
	"github.com/yourusername/kpi-backend/internal/middleware"
	"github.com/yourusername/kpi-backend/internal/websocket"
)

// SetupRoutes initializes all application routes for Ottodot
func SetupRoutes(router *gin.Engine) {
	// Apply global middleware
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())
	router.Use(middleware.Recovery())
	router.Use(middleware.ErrorHandler())

	// Serve static uploads
	router.Static("/uploads", "./uploads")

	// ==================== OTTODOT TRIAL BOOKING ROUTES ====================
	ottodotCtrl := controllers.NewOttodotController()
	authCtrl := controllers.NewAuthController()

	v1 := router.Group("/api/v1")
	{
		v1.POST("/auth/login", authCtrl.Login)
		v1.GET("/classes", ottodotCtrl.GetClasses)
		v1.POST("/bookings", ottodotCtrl.CreateBooking)
		v1.POST("/payments/process", ottodotCtrl.ProcessPayment)
		v1.GET("/parents", ottodotCtrl.GetParentsAndStudents)
		v1.GET("/admin/classes/:id/roster", ottodotCtrl.GetClassRoster)
		v1.PUT("/admin/classes/:id", ottodotCtrl.UpdateClassCapacity)
	}

	// WebSocket Real-time Endpoint for Seat & Roster Broadcasts
	router.GET("/ws", websocket.HandleWebSocket)
}
