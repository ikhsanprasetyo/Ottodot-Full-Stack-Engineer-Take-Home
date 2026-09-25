package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found or error loading it")
	}

	dsn := os.Getenv("POSTGRES_DSN_DEMO")
	if dsn == "" {
		log.Fatal("POSTGRES_DSN_DEMO is not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to demo database:", err)
	}

	err = db.Exec("UPDATE users SET username = username || '-deleted-' || id::text, email = email || '-deleted-' || id::text WHERE is_deleted = true AND username NOT LIKE '%-deleted-%';").Error
	if err != nil {
		log.Fatal("Failed to update existing soft-deleted users:", err)
	}
	
	log.Println("Successfully appended suffix to existing soft-deleted users")
}
