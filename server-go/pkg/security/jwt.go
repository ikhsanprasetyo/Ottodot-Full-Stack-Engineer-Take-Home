package security

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
)

// JWTClaims custom claims for JWT tokens
type JWTClaims struct {
	UserID       string `json:"id"`
	TokenVersion int    `json:"version"`
	jwt.RegisteredClaims
}

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token expired")
)

// GenerateAccessToken creates a new access token matching Node.js implementation
// Node.js: ACCESS_EXPIRES_IN: 4 * 60 * 60 (4 hours)
func GenerateAccessToken(user *models.User, secret string) (string, error) {
	claims := JWTClaims{
		UserID:       user.ID.String(),
		TokenVersion: 1,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(4 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GenerateRefreshToken creates a new refresh token
// Node.js: REFRESH_EXPIRES_IN: 30 * 24 * 60 * 60 (30 days)
func GenerateRefreshToken(user *models.User, secret string) (string, error) {
	claims := JWTClaims{
		UserID:       user.ID.String(),
		TokenVersion: 1,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken validates JWT token and returns claims
func ValidateToken(tokenString string, secret string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ParseUserIDFromClaims extracts uuid.UUID from claims
func ParseUserIDFromClaims(claims *JWTClaims) (uuid.UUID, error) {
	return uuid.Parse(claims.UserID)
}

// GetAccessTokenMaxAgeInMs returns access token expiry in milliseconds
// Matches Node.js: TOKEN_CONFIG.ACCESS_EXPIRES_IN * 1000
func GetAccessTokenMaxAgeInMs() int64 {
	return 4 * 60 * 60 * 1000 // 4 hours in ms
}

// GetRefreshTokenMaxAgeInMs returns refresh token expiry in milliseconds
// Matches Node.js: TOKEN_CONFIG.REFRESH_EXPIRES_IN * 1000
func GetRefreshTokenMaxAgeInMs() int64 {
	return 30 * 24 * 60 * 60 * 1000 // 30 days in ms
}
