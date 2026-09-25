package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/routes"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	if err := config.Load(); err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	if err := logger.Initialize(config.AppConfig.Env); err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	logger.Log.Info("Starting Ottodot Trial Booking Server - Golang",
		zap.String("env", config.AppConfig.Env),
		zap.String("port", config.AppConfig.Port),
	)

	// Connect to PostgreSQL
	if err := config.ConnectPostgres(); err != nil {
		logger.Log.Fatal("Failed to connect to PostgreSQL", zap.Error(err))
	}
	defer config.DisconnectPostgres()

	// Set Gin mode
	gin.SetMode(config.AppConfig.GinMode)

	// Create Gin router
	router := gin.New()

	// Setup routes
	routes.SetupRoutes(router)

	// Create HTTP server
	srv := &http.Server{
		Addr:           ":" + config.AppConfig.Port,
		Handler:        router,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// Start server in goroutine
	go func() {
		logger.Log.Info("Server started",
			zap.String("address", srv.Addr),
			zap.String("mode", config.AppConfig.GinMode),
		)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Log.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Log.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Log.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Log.Info("Server exited")
}
