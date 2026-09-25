package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// ConnectPostgres establishes connection to PostgreSQL via GORM
func ConnectPostgres() error {
	// Gunakan DSN demo saat bukan production
	dsn := AppConfig.PostgresDSN
	if AppConfig.Env != "production" && AppConfig.PostgresDSNDemo != "" {
		dsn = AppConfig.PostgresDSNDemo
	}

	customLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second, // Increased to 1s to account for remote network latency
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
		PrepareStmt: true, // cache prepared statements
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

	// Manual Migration Patch for rtu_stock_ledgers product_id column
	db.Exec("ALTER TABLE rtu_stock_ledgers ADD COLUMN IF NOT EXISTS product_id UUID;")
	db.Exec("ALTER TABLE rtu_materials ALTER COLUMN current_price TYPE numeric(20,8);")
	db.Exec("ALTER TABLE rtu_material_price_histories ALTER COLUMN price TYPE numeric(20,8);")
	db.Exec("ALTER TABLE rtu_outlet_material_stocks ALTER COLUMN current_price TYPE numeric(20,8);")
	db.Exec("ALTER TABLE rtu_stock_ledgers ALTER COLUMN price_at_time TYPE numeric(20,8);")

	// [MIGRATION 1] Convert old text/varchar phone to jsonb array (backward compat)
	db.Exec(`
		DO $$ 
		BEGIN 
			IF EXISTS (
				SELECT 1 
				FROM information_schema.columns 
				WHERE table_name = 'rtu_vendors' 
				  AND column_name = 'phone' 
				  AND data_type IN ('text', 'character varying')
			) THEN
				ALTER TABLE rtu_vendors ALTER COLUMN phone TYPE jsonb USING 
					CASE 
						WHEN phone IS NULL OR phone = '' THEN '[]'::jsonb 
						WHEN phone LIKE '[%' THEN phone::jsonb 
						ELSE json_build_array(phone)::jsonb 
					END;
			END IF;

			-- Convert old text/varchar email to jsonb array before we process it below
			IF EXISTS (
				SELECT 1 
				FROM information_schema.columns 
				WHERE table_name = 'rtu_vendors' 
				  AND column_name = 'email' 
				  AND data_type IN ('text', 'character varying')
			) THEN
				ALTER TABLE rtu_vendors ALTER COLUMN email TYPE jsonb USING 
					CASE 
						WHEN email IS NULL OR email = '' THEN '[]'::jsonb 
						WHEN email LIKE '[%' THEN email::jsonb 
						ELSE json_build_array(email)::jsonb 
					END;
			END IF;
		END $$;
	`)

	// [MIGRATION 2] Merge email[] into contacts[].email, then drop the email column.
	// This consolidates all contact data into a single unified contacts array (name + phone + email per entry).
	db.Exec(`
		DO $$
		DECLARE
			v RECORD;
			i INTEGER;
			email_val TEXT;
			contact_count INTEGER;
			email_count INTEGER;
			updated_contacts JSONB;
		BEGIN
			-- Only run if email column still exists (idempotent guard)
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'rtu_vendors' AND column_name = 'email'
			) THEN
				FOR v IN
					SELECT id, contacts, email
					FROM rtu_vendors
					WHERE email IS NOT NULL AND email != '[]'::jsonb
				LOOP
					email_count   := jsonb_array_length(v.email);
					updated_contacts := COALESCE(v.contacts, '[]'::jsonb);
					contact_count := jsonb_array_length(updated_contacts);

					FOR i IN 0..email_count - 1 LOOP
						-- Strip surrounding JSON quotes to get plain text
						email_val := TRIM(BOTH '"' FROM (v.email->i)::text);

						IF i < contact_count THEN
							-- Merge into existing contact entry at same index
							updated_contacts := jsonb_set(
								updated_contacts,
								ARRAY[i::text, 'email'],
								to_json(email_val)::jsonb
							);
						ELSE
							-- Append a new contact entry with only email
							updated_contacts := updated_contacts || jsonb_build_array(
								jsonb_build_object('name', '', 'phone', '', 'email', email_val)
							);
							contact_count := contact_count + 1;
						END IF;
					END LOOP;

					UPDATE rtu_vendors SET contacts = updated_contacts WHERE id = v.id;
				END LOOP;

				-- Drop the old email column after data migration
				ALTER TABLE rtu_vendors DROP COLUMN IF EXISTS email;
			END IF;
		END $$;
	`)

	// [MIGRATION 3] Migrate old flat location columns of rtu_vendors into branches array
	db.Exec(`
		DO $$
		DECLARE
			has_address BOOLEAN := FALSE;
			has_city BOOLEAN := FALSE;
			has_province BOOLEAN := FALSE;
			has_lat BOOLEAN := FALSE;
			has_lng BOOLEAN := FALSE;
			has_gmaps BOOLEAN := FALSE;
			sql_query TEXT;
		BEGIN
			-- Ensure table exists and ensure branches column exists
			IF EXISTS (
				SELECT 1 FROM information_schema.tables WHERE table_name = 'rtu_vendors'
			) THEN
				ALTER TABLE rtu_vendors ADD COLUMN IF NOT EXISTS branches jsonb DEFAULT '[]'::jsonb;

				SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rtu_vendors' AND column_name = 'address') INTO has_address;
				SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rtu_vendors' AND column_name = 'city') INTO has_city;
				SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rtu_vendors' AND column_name = 'province') INTO has_province;
				SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rtu_vendors' AND column_name = 'latitude') INTO has_lat;
				SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rtu_vendors' AND column_name = 'longitude') INTO has_lng;
				SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rtu_vendors' AND column_name = 'google_maps_url') INTO has_gmaps;

				-- Only run migration if at least one old location column exists
				IF has_address OR has_city OR has_province OR has_lat OR has_lng OR has_gmaps THEN
					sql_query := 'UPDATE rtu_vendors SET branches = jsonb_build_array(jsonb_build_object('
						|| '''name'', ''Utama'', '
						|| '''address'', COALESCE(' || CASE WHEN has_address THEN 'address' ELSE '''''' END || ', ''''), '
						|| '''city'', COALESCE(' || CASE WHEN has_city THEN 'city' ELSE '''''' END || ', ''''), '
						|| '''province'', COALESCE(' || CASE WHEN has_province THEN 'province' ELSE '''''' END || ', ''''), '
						|| '''latitude'', ' || CASE WHEN has_lat THEN 'latitude' ELSE 'NULL' END || ', '
						|| '''longitude'', ' || CASE WHEN has_lng THEN 'longitude' ELSE 'NULL' END || ', '
						|| '''googleMapsUrl'', COALESCE(' || CASE WHEN has_gmaps THEN 'google_maps_url' ELSE '''''' END || ', '''') '
						|| ')) WHERE (branches IS NULL OR branches = ''[]''::jsonb)';

					EXECUTE sql_query;

					-- Drop the old flat location columns if they exist
					ALTER TABLE rtu_vendors DROP COLUMN IF EXISTS address;
					ALTER TABLE rtu_vendors DROP COLUMN IF EXISTS city;
					ALTER TABLE rtu_vendors DROP COLUMN IF EXISTS province;
					ALTER TABLE rtu_vendors DROP COLUMN IF EXISTS latitude;
					ALTER TABLE rtu_vendors DROP COLUMN IF EXISTS longitude;
					ALTER TABLE rtu_vendors DROP COLUMN IF EXISTS google_maps_url;
				END IF;
			END IF;
		END $$;
	`)

	// Make outlet_id nullable in rtu_distributions to support vendor returns
	db.Exec(`
		DO $$ 
		BEGIN 
			IF EXISTS (
				SELECT 1 
				FROM information_schema.columns 
				WHERE table_name='rtu_distributions' AND column_name='outlet_id' AND is_nullable='NO'
			) THEN 
				ALTER TABLE rtu_distributions ALTER COLUMN outlet_id DROP NOT NULL;
			END IF;
		END $$;
	`)

	// Clean up orphaned created_by/updated_by that reference non-existent users
	// Prevents FK constraint failures during AutoMigrate
	orphanCleanupTables := []string{
		"rtu_grns",
		"rtu_purchases",
		"rtu_production_batches",
		"rtu_distributions",
		"rtu_monthly_hpp",
	}
	for _, tbl := range orphanCleanupTables {
		db.Exec("UPDATE " + tbl + " SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users)")
		db.Exec("UPDATE " + tbl + " SET updated_by = NULL WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM users)")
	}

	// Run migration for history table first to avoid failure from other tables
	if err := db.AutoMigrate(
		&models.RTUPurchaseHistory{},
		&models.RTUGRNHistory{},
		&models.RTUProductionBatchHistory{},
		&models.RTUDistributionHistory{},
		&models.RTUMonthlyHPPHistory{},
		&models.RTUInvoiceReconcileHistory{},
		&models.RTUVendorHistory{},
		&models.RTUMaterialHistory{},
		&models.RTUProductHistory{},
		&models.RTUPaymentHistory{},
	); err != nil {
		fmt.Printf("⚠ History Table migration warning: %v\n", err)
	}

	// Run migration to ensure new tables exist
	if err := db.AutoMigrate(
		&models.UserActivity{},
		&models.RTUMaterial{},
		&models.RTUMaterialUnit{},
		&models.RTUVendor{},
		&models.RTUMaterialPriceHistory{},
		&models.RTUStockLedger{},
		&models.RTUOutletMaterialStock{},
		&models.RTUOutletProductStock{},
		&models.RTUOutletMaterialVendor{},
		&models.RTUProduct{},
		&models.RTUProductUnit{},
		&models.RTUPurchase{},
		&models.RTUPurchaseItem{},
		&models.RTUPayment{},
		&models.RTUPaymentDetail{},
		&models.RTUGRN{},
		&models.RTUGRNItem{},
		&models.RTUProductionBatch{},
		&models.RTUStockLot{},
		&models.RTUStockLotMovement{},
		&models.RTUMonthlyHPP{},
		&models.RTUBank{},
		&models.RTUInvoiceReconcile{},
		&models.RTUInvoiceReconcileItem{},
		&models.RTUCategory{},
		&models.RTUUnit{},
		&models.UserOnlineHistory{},
		&models.RTUPriceBackup{},
	); err != nil {
		fmt.Printf("⚠ Table migration warning: %v\n", err)
	}

	// Run index migrations for maximum query performance
	if err := runIndexMigrations(db); err != nil {
		fmt.Printf("⚠ Index migration warning: %v\n", err)
	}

	// Migrate existing data from users to user_activities if empty
	migrateUserActivity(db)

	// Backfill any past history performed_by records
	backfillHistoryPerformedBy(db)

	// Seed default categories and units
	seedDefaultCategoriesAndUnits(db)

	DB = db
	fmt.Printf("✓ PostgreSQL connected [%s]: %s\n", AppConfig.Env, maskDSN(dsn))

	return nil
}

func migrateUserActivity(db *gorm.DB) {
	var count int64
	db.Model(&models.UserActivity{}).Count(&count)
	if count == 0 {
		fmt.Println("⚡ Migrating existing user activity data...")
		// Copy last_seen_at from users to user_activities.
		// We use COALESCE(last_seen_at, created_at) to avoid nulls.
		// extracts is_online from live_login JSONB if exists.
		err := db.Exec(`
			INSERT INTO user_activities (user_id, last_seen_at, is_online)
			SELECT 
				id, 
				COALESCE(last_seen_at, created_at, NOW()),
				COALESCE((live_login->>'isOnline')::boolean, false)
			FROM users
			WHERE is_deleted = false
			ON CONFLICT (user_id) DO NOTHING
		`).Error
		if err != nil {
			fmt.Printf("⚠ Data migration warning: %v\n", err)
		} else {
			fmt.Println("✓ User activity migration completed")
		}
	}
}

func backfillHistoryPerformedBy(db *gorm.DB) {
	var firstUserID *uuid.UUID
	err := db.Raw("SELECT id FROM users WHERE is_deleted = false ORDER BY created_at ASC LIMIT 1").Scan(&firstUserID).Error
	if err != nil || firstUserID == nil {
		fmt.Println("⚠ backfillHistoryPerformedBy: No active user found for backfill")
		return
	}

	// 1. Backfill entity created_by / updated_by if NULL
	db.Exec("UPDATE rtu_vendors SET created_by = ? WHERE created_by IS NULL", firstUserID)
	db.Exec("UPDATE rtu_vendors SET updated_by = ? WHERE updated_by IS NULL", firstUserID)
	db.Exec("UPDATE rtu_materials SET created_by = ? WHERE created_by IS NULL", firstUserID)
	db.Exec("UPDATE rtu_materials SET updated_by = ? WHERE updated_by IS NULL", firstUserID)
	db.Exec("UPDATE rtu_products SET created_by = ? WHERE created_by IS NULL", firstUserID)
	db.Exec("UPDATE rtu_products SET updated_by = ? WHERE updated_by IS NULL", firstUserID)

	// 2. Backfill history performed_by from entity created_by/updated_by
	db.Exec(`
		UPDATE rtu_vendor_histories 
		SET performed_by = rtu_vendors.created_by 
		FROM rtu_vendors 
		WHERE rtu_vendor_histories.vendor_id = rtu_vendors.id 
		  AND rtu_vendor_histories.performed_by IS NULL 
		  AND rtu_vendors.created_by IS NOT NULL
	`)
	db.Exec(`
		UPDATE rtu_vendor_histories 
		SET performed_by = rtu_vendors.updated_by 
		FROM rtu_vendors 
		WHERE rtu_vendor_histories.vendor_id = rtu_vendors.id 
		  AND rtu_vendor_histories.performed_by IS NULL 
		  AND rtu_vendors.updated_by IS NOT NULL
	`)
	db.Exec(`
		UPDATE rtu_material_histories 
		SET performed_by = rtu_materials.created_by 
		FROM rtu_materials 
		WHERE rtu_material_histories.material_id = rtu_materials.id 
		  AND rtu_material_histories.performed_by IS NULL 
		  AND rtu_materials.created_by IS NOT NULL
	`)
	db.Exec(`
		UPDATE rtu_material_histories 
		SET performed_by = rtu_materials.updated_by 
		FROM rtu_materials 
		WHERE rtu_material_histories.material_id = rtu_materials.id 
		  AND rtu_material_histories.performed_by IS NULL 
		  AND rtu_materials.updated_by IS NOT NULL
	`)
	db.Exec(`
		UPDATE rtu_product_histories 
		SET performed_by = rtu_products.created_by 
		FROM rtu_products 
		WHERE rtu_product_histories.product_id = rtu_products.id 
		  AND rtu_product_histories.performed_by IS NULL 
		  AND rtu_products.created_by IS NOT NULL
	`)
	db.Exec(`
		UPDATE rtu_product_histories 
		SET performed_by = rtu_products.updated_by 
		FROM rtu_products 
		WHERE rtu_product_histories.product_id = rtu_products.id 
		  AND rtu_product_histories.performed_by IS NULL 
		  AND rtu_products.updated_by IS NOT NULL
	`)

	// 3. Fallback for any remaining NULL performed_by in histories
	db.Exec("UPDATE rtu_vendor_histories SET performed_by = ? WHERE performed_by IS NULL", firstUserID)
	db.Exec("UPDATE rtu_material_histories SET performed_by = ? WHERE performed_by IS NULL", firstUserID)
	db.Exec("UPDATE rtu_product_histories SET performed_by = ? WHERE performed_by IS NULL", firstUserID)

	fmt.Println("✓ History performed_by backfill completed")
}

// runIndexMigrations creates performance-critical indexes if they don't exist.
func runIndexMigrations(db *gorm.DB) error {
	// Fix idx_rtu_hpp_outlet_month: was single-col on month_year only; must be composite (outlet_id, month_year)
	db.Exec("DROP INDEX IF EXISTS idx_rtu_hpp_outlet_month")
	if err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_rtu_hpp_outlet_month ON rtu_monthly_hpp (outlet_id, month_year)").Error; err != nil {
		fmt.Printf("⚠ HPP index migration warning: %v\n", err)
	}

	indexes := []string{
		// 1. Audit Logs (History Tracking)
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs (entity_id, created_at DESC)`,

		// 2. Users (Partial index for active users lookup)
		`CREATE INDEX IF NOT EXISTS idx_users_id_active ON users (id) WHERE is_deleted = false`,

		// 3. RTU Stock Ledger (Critical for traceability)
		`CREATE INDEX IF NOT EXISTS idx_rtu_stock_ledger_material_date ON rtu_stock_ledgers (material_id, created_at DESC)`,

		// 4. RTU Material Price History (Critical for costing)
		`CREATE INDEX IF NOT EXISTS idx_rtu_price_history_material_date ON rtu_material_price_histories (material_id, effective_date DESC)`,

		// 5. RTU Production Batches (Status filters)
		`CREATE INDEX IF NOT EXISTS idx_rtu_batch_status_product ON rtu_production_batches (status, product_id) WHERE is_deleted = false`,
	}

	for _, sql := range indexes {
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("failed to create index: %w\nsql: %s", err, sql)
		}
	}

	fmt.Println("✓ Performance indexes ensured for Production")
	return nil
}

// DisconnectPostgres closes the PostgreSQL connection
func DisconnectPostgres() error {
	if DB == nil {
		return nil
	}
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// maskDSN hides the password from logs
func maskDSN(dsn string) string {
	// Simple mask: show only host part
	for i, c := range dsn {
		if c == '@' {
			return "postgres://***@" + dsn[i+1:]
		}
	}
	return dsn
}

func seedDefaultCategoriesAndUnits(db *gorm.DB) {
	// Seeding Categories
	var categoryCount int64
	db.Model(&models.RTUCategory{}).Count(&categoryCount)
	if categoryCount == 0 {
		fmt.Println("⚡ Seeding default RTU categories...")
		defaultCategories := []string{"Mentah", "Matang", "Kemasan", "RTU"}
		for _, catName := range defaultCategories {
			cat := models.RTUCategory{
				Name:     catName,
				IsActive: true,
			}
			if err := db.Create(&cat).Error; err != nil {
				fmt.Printf("⚠ Failed to seed category %s: %v\n", catName, err)
			}
		}
		fmt.Println("✓ Seeding RTU categories completed")
	}

	// Seeding Units
	var unitCount int64
	db.Model(&models.RTUUnit{}).Count(&unitCount)
	if unitCount == 0 {
		fmt.Println("⚡ Seeding default RTU units...")
		defaultUnits := []string{"kg", "gr", "L", "ml", "pcs"}
		for _, unitName := range defaultUnits {
			unit := models.RTUUnit{
				Name:     unitName,
				IsActive: true,
			}
			if err := db.Create(&unit).Error; err != nil {
				fmt.Printf("⚠ Failed to seed unit %s: %v\n", unitName, err)
			}
		}
		fmt.Println("✓ Seeding RTU units completed")
	}
}

