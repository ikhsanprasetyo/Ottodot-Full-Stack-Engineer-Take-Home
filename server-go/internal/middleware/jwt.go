package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/utils"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"github.com/yourusername/kpi-backend/pkg/security"
	"go.uber.org/zap"
)

// JWTMiddleware struct for dependency injection
type JWTMiddleware struct {
	userRepo *repositories.UserRepository
}

// NewJWTMiddleware creates new JWT middleware instance
func NewJWTMiddleware(userRepo *repositories.UserRepository) *JWTMiddleware {
	return &JWTMiddleware{
		userRepo: userRepo,
	}
}

// Protect is the main JWT protection middleware
func (m *JWTMiddleware) Protect(ctx *gin.Context) {
	var token string
	
	// Try to get from Authorization header first
	authHeader := ctx.GetHeader("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}
	
	// If not in header, try cookie
	if token == "" {
		cookieToken, err := ctx.Cookie("accessToken")
		if err == nil {
			token = cookieToken
		}
	}

	// Try query parameter (useful for WebSockets)
	if token == "" {
		token = ctx.Query("token")
	}

	if token == "" {
		utils.ErrorResponse(ctx, http.StatusUnauthorized, "Unauthorized - No token provided")
		ctx.Abort()
		return
	}

	claims, err := security.ValidateToken(token, config.AppConfig.JWTSecret)
	if err != nil {
		if err == security.ErrExpiredToken {
			utils.ErrorResponse(ctx, http.StatusUnauthorized, "Token expired")
		} else {
			utils.ErrorResponse(ctx, http.StatusUnauthorized, "Invalid token")
		}
		ctx.Abort()
		return
	}

	userID, err := security.ParseUserIDFromClaims(claims)
	if err != nil {
		logger.Log.Error("Failed to parse user ID from token", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusUnauthorized, "Invalid token")
		ctx.Abort()
		return
	}

	user, err := m.userRepo.FindByID(ctx.Request.Context(), userID)
	if err != nil {
		logger.Log.Error("Database error in JWT middleware", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Internal server error")
		ctx.Abort()
		return
	}

	if user == nil {
		utils.ErrorResponse(ctx, http.StatusUnauthorized, "User not found")
		ctx.Abort()
		return
	}

	if user.TokenVersion != claims.TokenVersion {
		utils.ErrorResponse(ctx, http.StatusUnauthorized, "Token invalidated")
		ctx.Abort()
		return
	}

	ctx.Set("user", user)
	ctx.Set("userID", user.ID)

	ctx.Next()
}

// OptionalJWT middleware that doesn't require authentication but sets user if token exists
func (m *JWTMiddleware) OptionalJWT(ctx *gin.Context) {
	var token string
	
	// Try to get from Authorization header first
	authHeader := ctx.GetHeader("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}
	
	// If not in header, try cookie
	if token == "" {
		cookieToken, err := ctx.Cookie("accessToken")
		if err == nil {
			token = cookieToken
		}
	}

	// Try query parameter
	if token == "" {
		token = ctx.Query("token")
	}

	if token == "" {
		ctx.Next()
		return
	}

	claims, err := security.ValidateToken(token, config.AppConfig.JWTSecret)
	if err != nil {
		ctx.Next()
		return
	}

	userID, err := security.ParseUserIDFromClaims(claims)
	if err != nil {
		ctx.Next()
		return
	}

	user, err := m.userRepo.FindByID(ctx.Request.Context(), userID)
	if err != nil || user == nil {
		ctx.Next()
		return
	}

	ctx.Set("user", user)
	ctx.Set("userID", user.ID)

	ctx.Next()
}

// Handler functions version (for simpler injection if needed)
func ProtectFunc(userRepo *repositories.UserRepository) gin.HandlerFunc {
	m := NewJWTMiddleware(userRepo)
	return m.Protect
}

func OptionalJWTFunc(userRepo *repositories.UserRepository) gin.HandlerFunc {
	m := NewJWTMiddleware(userRepo)
	return m.OptionalJWT
}
