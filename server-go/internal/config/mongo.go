package config

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
)

var (
	HRISMongoClient *mongo.Client
	HRISMongoDB     *mongo.Database
)

// InitMongoDB initializes the MongoDB connection for HRIS
func InitMongoDB() error {
	uri := AppConfig.HRISMongoURI
	if AppConfig.Env == "demo" && AppConfig.HRISMongoURIDemo != "" {
		uri = AppConfig.HRISMongoURIDemo
	}

	if uri == "" {
		logger.Log.Warn("HRIS_MONGO_URI is not set, skipping MongoDB initialization")
		return nil
	}

	// Clean URI from quotes if any (common in some .env files)
	uri = strings.Trim(uri, "'\" ")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %v", err)
	}

	// Ping the database
	err = client.Ping(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to ping MongoDB: %v", err)
	}

	HRISMongoClient = client
	
	// Extract DB name from URI or use default
	dbName := extractDBName(uri)
	HRISMongoDB = client.Database(dbName)

	logger.Log.Info("Connected to MongoDB HRIS", zap.String("database", dbName))
	return nil
}

func extractDBName(uri string) string {
	// Simple extraction: mongodb://user:pass@host/dbname?auth...
	// We want the part between last '/' and '?'
	lastSlash := strings.LastIndex(uri, "/")
	if lastSlash == -1 {
		return "hris_sinarutama"
	}
	
	dbPart := uri[lastSlash+1:]
	questionMark := strings.Index(dbPart, "?")
	if questionMark != -1 {
		return dbPart[:questionMark]
	}
	
	return dbPart
}
