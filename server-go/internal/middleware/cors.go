package middleware

import (
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

// CORS middleware handles Cross-Origin Resource Sharing
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		method := c.Request.Method
		
		// Always set debug header to prove request reached the new logic
		c.Header("X-Backend-CORS", "v2-processed")
		
		if origin == "" {
			if referer := c.Request.Referer(); referer != "" {
				if u, err := url.Parse(referer); err == nil {
					origin = u.Scheme + "://" + u.Host
				}
			}
			if origin == "" {
				origin = "http://localhost:3000"
			}
		}
		
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Vary", "Origin")
		
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Accept, Cache-Control, X-Requested-With, x-refresh-request, x-skip-refresh, Token, session, X-Refresh-Request, X-Skip-Refresh")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Cache-Control, Content-Language, Content-Type, X-Backend-CORS")
		c.Header("Access-Control-Max-Age", "86400")

		// Handle Preflight (OPTIONS)
		if method == "OPTIONS" {
			// Log preflight if needed
			logger.Log.Debug("CORS Preflight (OPTIONS) Received", 
				zap.String("origin", origin), 
				zap.String("path", c.Request.URL.Path),
			)
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
