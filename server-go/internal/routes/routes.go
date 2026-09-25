package routes

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/controllers"
	"github.com/yourusername/kpi-backend/internal/middleware"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/services"
	"github.com/yourusername/kpi-backend/internal/websocket"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

// SetupRoutes initializes all application routes
func SetupRoutes(router *gin.Engine) {
	// Apply global middleware
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())
	router.Use(middleware.Recovery())
	router.Use(middleware.ErrorHandler())

	// Serve static uploads
	router.Static("/uploads", "./uploads")

	db := config.DB

	// Auto-migrate KPI-related models only
	db.AutoMigrate(
		&models.Outlet{},
		&models.Position{},
		&models.User{},
		&models.AuditLog{},
		// RTU HPP Settings & Monthly (Moved up to ensure migration runs before any FK constraint errors)
		&models.RTUMonthlyHPP{},
		&models.RTUMonthlyHPPHistory{},
		// RTU Phase 1
		&models.RTUVendor{},
		&models.RTUMaterial{},
		&models.RTUMaterialPriceHistory{},
		&models.RTUStockLedger{},
		&models.RTUProduct{},
		&models.RTURecipe{},
		&models.RTURecipeVersion{},
		&models.RTURecipeIngredient{},
		// RTU Phase 3
		&models.RTUGRN{},
		&models.RTUGRNItem{},
		&models.RTUProductionBatch{},
		&models.RTUMaterialUsage{},
		&models.RTULaborItem{},
		&models.RTUOverheadItem{},
		// RTU Phase 4
		&models.RTUDistribution{},
		&models.RTUDistributionItem{},
		// RTU Purchase (Inter-Outlet)
		&models.RTUPurchase{},
		&models.RTUPurchaseItem{},
		// RTU Multi-Outlet
		&models.RTUOutletMaterialStock{},
		&models.RTUOutletProductStock{},
		&models.RTUOutletMaterialVendor{},
		// RTU Invoice Reconcile (Vendor AP Invoice, separate from GRN)
		&models.RTUInvoiceReconcile{},
		&models.RTUInvoiceReconcileItem{},
		&models.RTUInvoiceReconcileHistory{},
		&models.RTUCategory{},
		&models.RTUUnit{},
		&models.AIChatSession{},
		&models.AIChatMessage{},
	)

	// RTU Indexes are now handled in database.go runIndexMigrations()

	// Initialize repositories
	userRepo := repositories.NewUserRepository(db)
	outletRepo := repositories.NewOutletRepository(db)
	positionRepo := repositories.NewPositionRepository(db)

	// RTU Repositories
	rtuVendorRepo := repositories.NewRTUVendorRepository(db)
	rtuMaterialRepo := repositories.NewRTUMaterialRepository(db)
	rtuProductRepo := repositories.NewRTUProductRepository(db)
	rtuRecipeRepo := repositories.NewRTURecipeRepository(db)
	rtuGRNRepo := repositories.NewRTUGRNRepository(db)
	rtuInvoiceReconcileRepo := repositories.NewRTUInvoiceReconcileRepository(db)
	rtuBatchRepo := repositories.NewRTUProductionBatchRepository(db)
	rtuDistRepo := repositories.NewRTUDistributionRepository(db)
	rtuPurchaseRepo := repositories.NewRTUPurchaseRepository(db)
	rtuCategoryRepo := repositories.NewRTUCategoryRepository(db)
	rtuUnitRepo := repositories.NewRTUUnitRepository(db)

	// Reset online status for all users on startup (clears "zombie" online statuses)
	if err := userRepo.ResetOnlineStatuses(context.Background()); err != nil {
		logger.Log.Warn("Failed to reset online statuses on startup", zap.Error(err))
	}

	// Initialize WebSocket Hub
	hub := websocket.NewHub(userRepo)
	go hub.Run()

	// Initialize services
	authService := services.NewAuthService(config.AppConfig.JWTSecret, config.AppConfig.JWTRefreshSecret)
	authService.SetUserRepo(userRepo)
	emailService := services.NewEmailService()

	// RTU Services
	rtuMaterialService := services.NewRTUMaterialService(db, rtuMaterialRepo, hub)
	rtuGRNService := services.NewRTUGRNService(db, rtuGRNRepo, rtuMaterialRepo)
	rtuInvoiceReconcileService := services.NewRTUInvoiceReconcileService(db, rtuInvoiceReconcileRepo)
	rtuBatchService := services.NewRTUProductionBatchService(db, rtuBatchRepo)
	rtuDistService := services.NewRTUDistributionService(db, rtuDistRepo)
	rtuPurchaseService := services.NewRTUPurchaseService(db, rtuPurchaseRepo)
	rtuReportService := services.NewRTUReportService(db)
	rtuLedgerRepo := repositories.NewRTUStockLedgerRepository(db)
	rtuLedgerService := services.NewRTUStockLedgerService(rtuLedgerRepo)
	rtuPaymentRepo := repositories.NewRTUPaymentRepository(db)
	rtuPaymentService := services.NewRTUPaymentService(db, rtuPaymentRepo)

	// Initialize controllers
	authController := controllers.NewAuthController(authService, emailService)
	outletController := controllers.NewOutletController(outletRepo, hub)
	positionController := controllers.NewPositionController(positionRepo)
	userController := controllers.NewUserController(userRepo)

	// RTU Controllers
	rtuVendorController := controllers.NewRTUVendorController(rtuVendorRepo, hub)
	rtuMaterialController := controllers.NewRTUMaterialController(rtuMaterialRepo, rtuMaterialService, hub)
	rtuProductController := controllers.NewRTUProductController(rtuProductRepo, hub)
	rtuRecipeController := controllers.NewRTURecipeController(rtuRecipeRepo, hub)
	rtuGRNController := controllers.NewRTUGRNController(rtuGRNRepo, rtuGRNService, hub)
	rtuInvoiceReconcileController := controllers.NewRTUInvoiceReconcileController(rtuInvoiceReconcileService, hub)
	rtuBatchController := controllers.NewRTUProductionBatchController(rtuBatchRepo, rtuBatchService, hub)
	rtuDistController := controllers.NewRTUDistributionController(rtuDistRepo, rtuDistService, hub)
	rtuPurchaseController := controllers.NewRTUPurchaseController(rtuPurchaseRepo, rtuPurchaseService, hub)
	rtuPaymentController := controllers.NewRTUPaymentController(rtuPaymentService, hub)
	rtuReportController := controllers.NewRTUReportController(rtuReportService)
	rtuLedgerController := controllers.NewRTUStockLedgerController(rtuLedgerRepo, rtuLedgerService)
	rtuCategoryController := controllers.NewRTUCategoryController(rtuCategoryRepo, hub)
	rtuUnitController := controllers.NewRTUUnitController(rtuUnitRepo, hub)
	rtuPriceBackupRepo := repositories.NewRTUPriceBackupRepository(db)
	rtuPriceBackupController := controllers.NewRTUPriceBackupController(db, rtuPriceBackupRepo, rtuMaterialRepo, rtuProductRepo, hub)
	aiController := controllers.NewAIController()

	// Initialize JWT middleware
	jwtMiddleware := middleware.NewJWTMiddleware(userRepo)

	// Global OPTIONS handler for CORS preflight
	router.OPTIONS("/*path", func(c *gin.Context) {})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
			"server": "KPI Sinar Utama Backend - Golang",
			"env":    config.AppConfig.Env,
		})
	})

	// API routes group
	api := router.Group("/api")
	{
		// WebSocket endpoint
		api.GET("/ws", jwtMiddleware.Protect, func(c *gin.Context) {
			websocket.ServeWs(hub, c)
		})

		// Status endpoint
		api.GET("/status", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"server":  "✓ Server is running in " + config.AppConfig.Env + " mode",
				"golang":  true,
				"version": "1.0.0",
				"app":     "KPI Sinar Utama",
			})
		})

		// Health endpoint
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "healthy",
				"server": "RTU Sinar Utama Backend - Golang",
				"env":    config.AppConfig.Env,
			})
		})

		// ==================== AUTH ROUTES ====================
		auth := api.Group("/user")
		{
			auth.POST("/login", authController.Login)
			auth.POST("/register", authController.Register)
			auth.POST("/logout", jwtMiddleware.Protect, authController.Logout)
			auth.POST("/forgot-password", authController.ForgotPassword)
			auth.POST("/reset-password/:token", authController.ResetPassword)
			auth.POST("/refresh-token", authController.RefreshToken)
		}

		// ==================== USER ROUTES ====================
		users := api.Group("/user")
		users.Use(jwtMiddleware.Protect)
		{
			users.GET("/profile", userController.GetProfile)
			users.PUT("/profile", userController.UpdateProfile)
			users.PUT("/change-password", userController.ChangePassword)
			users.PUT("/last-seen", userController.SetLastSeen)
			users.POST("/update-live-login", userController.UpdateLiveLogin)
			users.GET("/online-history", userController.GetUserOnlineHistory)
			users.GET("/stats", userController.GetUserStats)
			
			users.GET("/all", userController.GetUsers)
			users.GET("/:id", userController.GetUserByID)
			users.POST("/:id", userController.CreateUser)
			users.PUT("/:id", userController.UpdateUser)
			users.DELETE("/:id", userController.DeleteUser)
			users.POST("/restore/:id", userController.RestoreUser)
			users.DELETE("/:id/permanent", userController.HardDeleteUser)
		}

		// ==================== OUTLET ROUTES ====================
		outlets := api.Group("/outlet")
		outlets.Use(jwtMiddleware.Protect)
		{
			outlets.GET("/all", outletController.GetOutlets)
			outlets.POST("/restore/:id", outletController.RestoreOutlet)
			outlets.GET("/:id", outletController.GetOutlet)
			outlets.POST("", outletController.AddOutlet)
			outlets.PUT("/:id", outletController.EditOutlet)
			outlets.DELETE("/:id", outletController.DeleteOutlet)
		}

		// ==================== POSITION ROUTES ====================
		positions := api.Group("/position")
		positions.Use(jwtMiddleware.Protect)
		{
			positions.GET("/all", positionController.GetPositions)
			positions.POST("/restore/:id", positionController.RestorePosition)
			positions.GET("/:id", positionController.GetPosition)
			positions.POST("", positionController.AddPosition)
			positions.PUT("/:id", positionController.EditPosition)
			positions.DELETE("/:id", positionController.DeletePosition)
		}

		// ==================== RTU ROUTES ====================
		rtu := api.Group("/rtu")
		rtu.Use(jwtMiddleware.Protect)
		{
			// Upload Image
			rtu.POST("/upload", controllers.UploadImage)
			rtu.DELETE("/upload", controllers.DeleteImage)

			// Vendors
			rtu.GET("/vendor/all", rtuVendorController.GetVendors)
			rtu.GET("/vendor/:id", rtuVendorController.GetVendor)
			rtu.POST("/vendor", rtuVendorController.CreateVendor)
			rtu.PUT("/vendor/:id", rtuVendorController.UpdateVendor)
			rtu.DELETE("/vendor/:id", rtuVendorController.DeleteVendor)
			rtu.POST("/vendor/restore/:id", rtuVendorController.RestoreVendor)
			rtu.DELETE("/vendor/:id/permanent", rtuVendorController.HardDeleteVendor)

			// RTU Category Routes
			rtuCategory := rtu.Group("/category")
			{
				rtuCategory.POST("", rtuCategoryController.CreateCategory)
				rtuCategory.GET("/all", rtuCategoryController.GetCategories)
				rtuCategory.GET("/:id", rtuCategoryController.GetCategory)
				rtuCategory.PUT("/:id", rtuCategoryController.UpdateCategory)
				rtuCategory.DELETE("/:id", rtuCategoryController.DeleteCategory)
				rtuCategory.POST("/restore/:id", rtuCategoryController.RestoreCategory)
				rtuCategory.DELETE("/:id/permanent", rtuCategoryController.HardDeleteCategory)
			}

			// RTU Unit Routes
			rtuUnit := rtu.Group("/unit")
			{
				rtuUnit.POST("", rtuUnitController.CreateUnit)
				rtuUnit.GET("/all", rtuUnitController.GetUnits)
				rtuUnit.GET("/:id", rtuUnitController.GetUnit)
				rtuUnit.PUT("/:id", rtuUnitController.UpdateUnit)
				rtuUnit.DELETE("/:id", rtuUnitController.DeleteUnit)
				rtuUnit.POST("/restore/:id", rtuUnitController.RestoreUnit)
				rtuUnit.DELETE("/:id/permanent", rtuUnitController.HardDeleteUnit)
			}

			// RTU Material Routes
			rtuMaterial := rtu.Group("/material")
			{
				rtuMaterial.POST("", rtuMaterialController.CreateMaterial)
				rtuMaterial.GET("/all", rtuMaterialController.GetMaterials)
				rtuMaterial.GET("/:id", rtuMaterialController.GetMaterial)
				rtuMaterial.PUT("/:id", rtuMaterialController.UpdateMaterial)
				rtuMaterial.DELETE("/:id", rtuMaterialController.DeleteMaterial)
				rtuMaterial.POST("/restore/:id", rtuMaterialController.RestoreMaterial)
				rtuMaterial.DELETE("/:id/permanent", rtuMaterialController.HardDeleteMaterial)

				rtuMaterial.GET("/:id/stock-ledger", rtuMaterialController.GetStockLedger)
				rtuMaterial.GET("/:id/price-history", rtuMaterialController.GetPriceHistory)
				rtuMaterial.POST("/:id/stock-adjust", rtuMaterialController.AdjustStock)
				rtuMaterial.PUT("/:id/price", rtuMaterialController.UpdatePrice)
				rtuMaterial.POST("/outlet-vendor", rtuMaterialController.SetOutletVendor)
				rtuMaterial.GET("/outlet-vendor", rtuMaterialController.GetOutletVendor)
				rtuMaterial.GET("/:id/lots", rtuMaterialController.GetLots)
				rtuMaterial.POST("/copy-prices", rtuPriceBackupController.CopyMaterialPrices)
				rtuMaterial.GET("/backups", rtuPriceBackupController.GetMaterialPriceBackups)
				rtuMaterial.POST("/restore-backup/:id", rtuPriceBackupController.RestoreMaterialPriceBackup)
			}

			// RTU Product Routes
			rtuProduct := rtu.Group("/product")
			{
				rtuProduct.POST("", rtuProductController.CreateProduct)
				rtuProduct.GET("/all", rtuProductController.GetProducts)
				rtuProduct.GET("/:id", rtuProductController.GetProduct)
				rtuProduct.PUT("/:id", rtuProductController.UpdateProduct)
				rtuProduct.DELETE("/:id", rtuProductController.DeleteProduct)
				rtuProduct.POST("/restore/:id", rtuProductController.RestoreProduct)
				rtuProduct.DELETE("/:id/permanent", rtuProductController.HardDeleteProduct)
				rtuProduct.GET("/:id/lots", rtuProductController.GetLots)
				rtuProduct.POST("/copy-prices", rtuPriceBackupController.CopyProductPrices)
				rtuProduct.GET("/backups", rtuPriceBackupController.GetProductPriceBackups)
				rtuProduct.POST("/restore-backup/:id", rtuPriceBackupController.RestoreProductPriceBackup)
			}

			// RTU Recipe Routes
			rtuRecipe := rtu.Group("/recipe")
			{
				rtuRecipe.GET("/by-product/:id", rtuRecipeController.GetRecipeByProduct)
				rtuRecipe.POST("/:id/draft", rtuRecipeController.DraftVersion)
				rtuRecipe.POST("/:id/activate/:versionId", rtuRecipeController.ActivateVersion)
				rtuRecipe.DELETE("/version/:versionId", rtuRecipeController.DeleteVersion)
			}

			// RTU GRN Routes
			rtuGRN := rtu.Group("/grn")
			{
				rtuGRN.GET("/all", rtuGRNController.GetGRNs)
				rtuGRN.GET("/:id", rtuGRNController.GetGRN)
				rtuGRN.POST("", rtuGRNController.CreateGRN)
				rtuGRN.PUT("/:id", rtuGRNController.UpdateGRN)
				rtuGRN.POST("/confirm/:id", rtuGRNController.ConfirmGRN)
				rtuGRN.POST("/cancel/:id", rtuGRNController.CancelGRN)
			}

			// RTU Invoice Reconcile Routes (Vendor AP Invoice - separate from GRN)
			rtuInvoice := rtu.Group("/invoice")
			{
				rtuInvoice.GET("/all", rtuInvoiceReconcileController.GetInvoices)
				rtuInvoice.GET("/:id", rtuInvoiceReconcileController.GetInvoice)
				rtuInvoice.POST("", rtuInvoiceReconcileController.CreateInvoice)
				rtuInvoice.PUT("/:id", rtuInvoiceReconcileController.UpdateInvoice)
				rtuInvoice.POST("/confirm/:id", rtuInvoiceReconcileController.ConfirmInvoice)
				rtuInvoice.POST("/cancel/:id", rtuInvoiceReconcileController.CancelInvoice)
			}

			// RTU Production Batch Routes
                        rtuBatch := rtu.Group("/batch")
                        {
                                rtuBatch.GET("/all", rtuBatchController.GetBatches)
                                rtuBatch.GET("/hris-positions", rtuBatchController.GetHRISPositions)
                                rtuBatch.GET("/:id", rtuBatchController.GetBatch)
                                rtuBatch.POST("", rtuBatchController.CreateBatch)
                                rtuBatch.PUT("/:id", rtuBatchController.UpdateBatch)
                                rtuBatch.DELETE("/:id", rtuBatchController.DeleteBatch)
                                rtuBatch.POST("/start/:id", rtuBatchController.StartBatch)
                                rtuBatch.POST("/complete/:id", rtuBatchController.CompleteBatch)
                                rtuBatch.POST("/cancel/:id", rtuBatchController.CancelBatch)
                        }

			// RTU Distribution Routes
			rtuDist := rtu.Group("/distribution")
			{
				rtuDist.GET("/all", rtuDistController.GetDistributions)
				rtuDist.GET("/:id", rtuDistController.GetDistribution)
				rtuDist.POST("", rtuDistController.CreateDistribution)
				rtuDist.PUT("/:id", rtuDistController.UpdateDistribution)
				rtuDist.POST("/ship/:id", rtuDistController.ShipDistribution)
				rtuDist.POST("/receive/:id", rtuDistController.ReceiveDistribution)
				rtuDist.POST("/cancel/:id", rtuDistController.CancelDistribution)
			}

			// RTU Purchase Routes (Inter-Outlet)
			rtuPurchase := rtu.Group("/purchase")
			{
				rtuPurchase.GET("/all", rtuPurchaseController.GetPurchases)
				rtuPurchase.GET("/:id", rtuPurchaseController.GetPurchase)
				rtuPurchase.POST("", rtuPurchaseController.CreatePurchase)
				rtuPurchase.POST("/process/:id", rtuPurchaseController.ProcessPurchase)
				rtuPurchase.POST("/receive/:id", rtuPurchaseController.ReceivePurchase)
				rtuPurchase.POST("/cancel/:id", rtuPurchaseController.CancelPurchase)
			}

			// RTU Report Routes
			rtuReport := rtu.Group("/report")
			{
				rtuReport.GET("/summary", rtuReportController.GetDashboardSummary)
			}

			// RTU Payments
			rtuPayment := rtu.Group("/payment")
			{
				rtuPayment.POST("", rtuPaymentController.CreatePayment)
				rtuPayment.GET("", rtuPaymentController.GetPayments)
				rtuPayment.GET("/banks", rtuPaymentController.GetRTUBanks)
				rtuPayment.GET("/:id", rtuPaymentController.GetPaymentByID)
				rtuPayment.PUT("/:id/complete", rtuPaymentController.CompletePayment)
				rtuPayment.PUT("/:id/cancel", rtuPaymentController.CancelPayment)
			}

			// RTU Stock Ledger Routes
			rtuLedger := rtu.Group("/ledger")
			{
				rtuLedger.GET("/all", rtuLedgerController.GetAll)
			}

			// RTU Monthly HPP Settings
			rtuHPP := rtu.Group("/hpp")
			{
				// Keep order: specific routes first, then general routes.
				rtuHPP.GET("/matrix", controllers.GetHPPMatrix)
				rtuHPP.GET("/all", controllers.GetAllMonthlyHPP)
				rtuHPP.GET("", controllers.GetMonthlyHPP)
				rtuHPP.POST("", controllers.UpsertMonthlyHPP)
			}
		}

		// ==================== AI CHAT ROUTES ====================
		aiGroup := api.Group("/ai")
		aiGroup.Use(jwtMiddleware.Protect)
		{
			aiGroup.POST("/chat", aiController.Chat)
			aiGroup.GET("/sessions", aiController.GetSessions)
			aiGroup.POST("/sessions", aiController.CreateSession)
			aiGroup.GET("/sessions/:id/messages", aiController.GetSessionMessages)
			aiGroup.DELETE("/sessions/:id", aiController.DeleteSession)
			aiGroup.GET("/settings", aiController.GetSettings)
			aiGroup.POST("/settings", aiController.UpdateSettings)
		}
	}
}
