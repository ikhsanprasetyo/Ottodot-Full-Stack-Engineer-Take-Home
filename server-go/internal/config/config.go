package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	// PostgreSQL
	PostgresDSN     string
	PostgresDSNDemo string


	// Server
	Port           string
	GinMode        string
	AllowedOrigins []string

	// JWT
	JWTSecret           string
	JWTRefreshSecret    string
	JWTExpiration       string
	JWTRefreshExpiration string

	// Environment
	Env         string
	FrontendURL string

	// SMTP Email
	SMTPHost    string
	SMTPUser    string
	SMTPPass    string
	SMTPService string

	// Gemini AI
	GeminiAPIKey string

	// MongoDB HRIS
	HRISMongoURI     string
	HRISMongoURIDemo string
}

var AppConfig *Config

// Load loads configuration from environment variables
func Load() error {
	// Load .env file if exists
	_ = godotenv.Load()

	port := getEnv("PORT", "5570")

	// Forced override for standby instance (rtu-server-linux-2) regardless of .env PORT=5570
	execPath := os.Args[0]
	if strings.HasSuffix(execPath, "2") || strings.HasSuffix(execPath, "-2") || strings.Contains(execPath, "linux-2") {
		port = "5571"
	}

	if customPort := os.Getenv("PORT_OVERRIDE"); customPort != "" {
		port = customPort
	}

	AppConfig = &Config{
		PostgresDSN:          getEnv("POSTGRES_DSN", "postgres://postgres:postgres@localhost:5432/kpi_sinut?sslmode=disable"),
		PostgresDSNDemo:      getEnv("POSTGRES_DSN_DEMO", "postgres://postgres:postgres@localhost:5432/kpi_sinut_demo?sslmode=disable"),
		Port:                 port,
		GinMode:              getEnv("GIN_MODE", "debug"),
		AllowedOrigins:       parseOrigins(getEnv("ALLOWED_ORIGINS", "http://localhost:3000")),
		JWTSecret:            getEnv("JWT_SECRET", ""),
		JWTRefreshSecret:     getEnv("JWT_REFRESH_SECRET", ""),
		JWTExpiration:        getEnv("JWT_EXPIRATION", "15m"),
		JWTRefreshExpiration: getEnv("JWT_REFRESH_EXPIRATION", "7d"),
		Env:                  getEnv("ENV", "development"),
		SMTPHost:             getEnv("HOST", "smtp.gmail.com"),
		SMTPUser:             getEnv("GOOGLEMAIL", ""),
		SMTPPass:             getEnv("GOOGLEMAIL_APP_PASSWORD", ""),
		SMTPService:          getEnv("SERVICE", "gmail"),
		FrontendURL:          getEnv("FRONTEND_URL", "http://localhost:3000"),
		GeminiAPIKey:         getEnv("GEMINI_API_KEY", ""),
		HRISMongoURI:         getEnv("HRIS_MONGO_URI", ""),
		HRISMongoURIDemo:     getEnv("HRIS_MONGO_URI_DEMO", ""),
	}

	// Validate critical configs
	if AppConfig.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET must be set")
	}
	if AppConfig.JWTRefreshSecret == "" {
		return fmt.Errorf("JWT_REFRESH_SECRET must be set")
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseOrigins(origins string) []string {
	var result []string
	current := ""
	for _, char := range origins {
		if char == ',' {
			if current != "" {
				result = append(result, current)
				current = ""
			}
		} else {
			current += string(char)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}
