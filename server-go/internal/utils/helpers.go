package utils

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// ParseInt64 parses string to int64 with default value
func ParseInt64(s string, defaultVal int64) int64 {
	if s == "" {
		return defaultVal
	}
	val, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return defaultVal
	}
	return val
}

// GetPaginationParams parses offset and limit from request
func GetPaginationParams(ctx *gin.Context) (offset, limit int64) {
	limit = ParseInt64(ctx.Query("limit"), 10)
	if limit < 1 {
		limit = 10
	}

	// ✅ Support explicit 'offset' param (Node.js style)
	if ctx.Query("offset") != "" {
		offset = ParseInt64(ctx.Query("offset"), 0)
		if offset < 0 {
			offset = 0
		}
		return offset, limit
	}

	// Fallback to 'page' param
	page := ParseInt64(ctx.Query("page"), 1)
	if page < 1 {
		page = 1
	}
	offset = (page - 1) * limit
	return offset, limit
}

// IsRunningInDevMode checks if app is running in development mode
func IsRunningInDevMode(env string) bool {
	return env != "production"
}

