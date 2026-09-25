package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

// Logger middleware untuk log setiap request
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		
		c.Next()

		duration := time.Since(start)
		statusCode := c.Writer.Status()

		logger.Log.Info("Request",
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Int("status", statusCode),
			zap.Duration("duration", duration),
			zap.String("ip", c.ClientIP()),
		)
	}
}
