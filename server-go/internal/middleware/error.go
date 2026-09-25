package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/internal/utils"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

// ErrorHandler middleware untuk handle error secara global
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if there are any errors
		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			
			logger.Log.Error("Request error",
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
				zap.Error(err),
			)

			// Return error response
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
	}
}

// Recovery middleware untuk handle panic
func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		logger.Log.Error("Panic recovered",
			zap.Any("error", recovered),
			zap.String("path", c.Request.URL.Path),
		)

		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal server error")
	})
}
