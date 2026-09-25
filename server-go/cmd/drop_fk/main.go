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

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		log.Fatal("POSTGRES_DSN is not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = db.Exec("ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_activity;").Error
	if err != nil {
		log.Fatal("Failed to drop constraint from database:", err)
	}
	
	log.Println("Successfully dropped fk_users_activity constraint from users table")
}
