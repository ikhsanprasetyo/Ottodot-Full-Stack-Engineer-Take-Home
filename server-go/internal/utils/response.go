package utils

import (
	"github.com/gin-gonic/gin"
)

// SuccessResponse sends a successful JSON response
func SuccessResponse(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, gin.H{
		"success": true,
		"data":    data,
	})
}

// SuccessWithMessageResponse sends a successful response with a message
func SuccessWithMessageResponse(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, gin.H{
		"success": true,
		"message": message,
		"data":    data,
	})
}

// ErrorResponse sends an error JSON response
func ErrorResponse(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{
		"success": false,
		"error":   message,
	})
}

// PaginationResponse sends a paginated response
func PaginationResponse(c *gin.Context, statusCode int, data interface{}, total int64, page, limit int) {
	c.JSON(statusCode, gin.H{
		"success": true,
		"data":    data,
		"pagination": gin.H{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}
