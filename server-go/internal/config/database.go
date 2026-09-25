package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/yourusername/kpi-backend/internal/data"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// ConnectPostgres establishes connection to PostgreSQL via GORM for Ottodot
func ConnectPostgres() error {
	dsn := AppConfig.PostgresDSN
	if AppConfig.Env != "production" && AppConfig.PostgresDSNDemo != "" {
		dsn = AppConfig.PostgresDSNDemo
	}

	customLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: customLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
		PrepareStmt: true,
	})
	if err != nil {
		return fmt.Errorf("failed to connect to PostgreSQL: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Connection pool settings
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	sqlDB.SetConnMaxIdleTime(2 * time.Minute)

	// Ping to verify
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("failed to ping PostgreSQL: %w", err)
	}

	// AutoMigrate Ottodot Models
	if err := db.AutoMigrate(
		&models.User{},
		&models.Parent{},
		&models.Student{},
		&models.TrialClass{},
		&models.Booking{},
		&models.PaymentAttempt{},
	); err != nil {
		fmt.Printf("⚠ Ottodot Table migration warning: %v\n", err)
	}

	// Create Partial Unique Index for Confirmed Bookings (Prevent duplicate confirmed bookings)
	db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_booking ON bookings (student_id, trial_class_id) WHERE status = 'confirmed';`)

	// Seed Ottodot Synthetic Dataset
	data.SeedOttodotData(db)

	DB = db
	fmt.Printf("✓ PostgreSQL connected [%s]: %s\n", AppConfig.Env, maskDSN(dsn))

	return nil
}

// DisconnectPostgres closes underlying sql.DB
func DisconnectPostgres() {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err == nil {
			sqlDB.Close()
			fmt.Println("✓ PostgreSQL connection closed")
		}
	}
}

func maskDSN(dsn string) string {
	if len(dsn) > 20 {
		return dsn[:10] + "..." + dsn[len(dsn)-10:]
	}
	return dsn
}
