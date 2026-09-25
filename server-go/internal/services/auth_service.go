package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/mileusna/useragent"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"github.com/yourusername/kpi-backend/pkg/security"
	"github.com/yourusername/kpi-backend/internal/utils"
	"go.uber.org/zap"
)

var (
	ErrInvalidCredentials = errors.New("invalid email, username or password")
	ErrEmailExists        = errors.New("email already exists")
	ErrUsernameExists     = errors.New("username already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidResetToken  = errors.New("invalid or expired token")
)

type AuthService struct {
	userRepo      *repositories.UserRepository
	jwtSecret     string
	refreshSecret string
}

func NewAuthService(jwtSecret, refreshSecret string) *AuthService {
	return &AuthService{
		jwtSecret:     jwtSecret,
		refreshSecret: refreshSecret,
	}
}

// SetUserRepo sets the user repository (for dependency injection)
func (s *AuthService) SetUserRepo(repo *repositories.UserRepository) {
	s.userRepo = repo
}

// LoginRequest login request payload
type LoginRequest struct {
	Email     string
	Password  string
	IP        string
	UserAgent string
}

// LoginResponse login response
type LoginResponse struct {
	User                *models.User
	AccessToken         string
	RefreshToken        string
	AccessTokenExpires  time.Time
	RefreshTokenExpires time.Time
}

// Login authenticates user and returns tokens
func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		logger.Log.Error("Database error during login",
			zap.String("email", req.Email),
			zap.Error(err),
		)
		return nil, err
	}

	if user == nil || !security.CheckPasswordHash(req.Password, user.Password) {
		logger.Log.Info("Login failed - invalid credentials",
			zap.String("event", "LOGIN_FAILED"),
			zap.String("reason", "WRONG_PASSWORD"),
			zap.String("email", req.Email),
			zap.String("ip", req.IP),
		)
		return nil, ErrInvalidCredentials
	}

	accessToken, err := security.GenerateAccessToken(user, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshToken, err := security.GenerateRefreshToken(user, s.refreshSecret)
	if err != nil {
		return nil, err
	}

	accessTokenExpires := time.Now().Add(4 * time.Hour)
	refreshTokenExpires := time.Now().Add(30 * 24 * time.Hour)

	// Update user with tokens
	_, err = s.userRepo.Update(ctx, user.ID, map[string]any{
		"refresh_token":           refreshToken,
		"access_token_expires_at": accessTokenExpires,
		"last_login_at":           time.Now(),
	})
	if err != nil {
		return nil, err
	}

	// ─── Record Login History (with GeoIP like byteseeker) ───────────────────
	ua := useragent.Parse(req.UserAgent)
	loginHistory := models.LoginHistory{
		LoginAt: time.Now(),
		IP:      req.IP,
		Device: &models.DeviceInfo{
			UA: req.UserAgent,
			Browser: &models.BrowserInfo{
				Name:    &ua.Name,
				Version: &ua.Version,
			},
			OS: &models.OSInfo{
				Name:    &ua.OS,
				Version: &ua.OSVersion,
			},
		},
	}

	// GeoIP lookup from IP (server-side, no browser permission needed)
	if geo, err := utils.GetGeoIP(req.IP); err == nil && geo != nil {
		loginHistory.Location = &models.Location{
			City:      &geo.City,
			Region:    &geo.RegionName,
			Country:   &geo.Country,
			Latitude:  &geo.Lat,
			Longitude: &geo.Lon,
		}
		if (loginHistory.IP == "127.0.0.1" || loginHistory.IP == "::1" || loginHistory.IP == "") && geo.Query != "" {
			loginHistory.IP = geo.Query
		}
	}

	if err := s.userRepo.UpdateLastLogin(ctx, user.ID, loginHistory); err != nil {
		logger.Log.Error("Failed to record login history",
			zap.String("userId", user.ID.String()),
			zap.Error(err),
		)
		// We don't block login if history fails
	}
	// ─────────────────────────────────────────────────────────────────────────

	user.AccessTokenExpiresAt = &accessTokenExpires

	logger.Log.Info("Login successful",
		zap.String("event", "LOGIN_SUCCESS"),
		zap.String("userId", user.ID.String()),
		zap.String("email", user.Email),
		zap.String("role", user.Role),
		zap.String("ip", req.IP),
	)

	user.Password = ""
	user.RefreshToken = nil
	user.ResetPasswordToken = nil
	user.ResetPasswordExpires = nil

	return &LoginResponse{
		User:                user,
		AccessToken:         accessToken,
		RefreshToken:        refreshToken,
		AccessTokenExpires:  accessTokenExpires,
		RefreshTokenExpires: refreshTokenExpires,
	}, nil
}

// RegisterRequest registration request payload
type RegisterRequest struct {
	Username  string
	Name      string
	Email     string
	Password  string
	IP        string
	UserAgent string
}

// Register creates a new user
func (s *AuthService) Register(ctx context.Context, req *RegisterRequest) (*LoginResponse, error) {
	emailExists, err := s.userRepo.CheckEmailExists(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if emailExists {
		return nil, ErrEmailExists
	}

	usernameExists, err := s.userRepo.CheckUsernameExists(ctx, req.Username)
	if err != nil {
		return nil, err
	}
	if usernameExists {
		return nil, ErrUsernameExists
	}

	user := &models.User{
		ID:           uuid.New(),
		Username:     req.Username,
		Name:         req.Name,
		Email:        req.Email,
		Password:     req.Password,
		Role:         "user",
		RoleApproval: "no",
	}

	err = s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return s.Login(ctx, &LoginRequest{
		Email:     req.Email,
		Password:  req.Password,
		IP:        req.IP,
		UserAgent: req.UserAgent,
	})
}

// ForgotPassword generates password reset token
func (s *AuthService) ForgotPassword(ctx context.Context, email string) (string, error) {
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return "", err
	}
	if user == nil {
		return "", ErrUserNotFound
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	resetToken := hex.EncodeToString(tokenBytes)

	hasher := sha256.New()
	hasher.Write([]byte(resetToken))
	hashedToken := hex.EncodeToString(hasher.Sum(nil))

	expires := time.Now().Add(15 * time.Minute)
	_, err = s.userRepo.Update(ctx, user.ID, map[string]any{
		"reset_password_token":   hashedToken,
		"reset_password_expires": expires,
	})
	
	return resetToken, err
}

// ResetPasswordRequest reset password request payload
type ResetPasswordRequest struct {
	Token       string
	NewPassword string
}

// ResetPassword resets password using token
func (s *AuthService) ResetPassword(ctx context.Context, req *ResetPasswordRequest) error {
	hasher := sha256.New()
	hasher.Write([]byte(req.Token))
	hashedToken := hex.EncodeToString(hasher.Sum(nil))

	user, err := s.userRepo.FindByResetToken(ctx, hashedToken)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrInvalidResetToken
	}

	hashedPassword, err := security.HashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	_, err = s.userRepo.Update(ctx, user.ID, map[string]any{
		"password":               hashedPassword,
		"reset_password_token":   nil,
		"reset_password_expires": nil,
		"token_version":          user.TokenVersion + 1,
	})
	
	return err
}

// Logout logs out user
func (s *AuthService) Logout(ctx context.Context, userID uuid.UUID) error {
	err := s.userRepo.IncrementTokenVersion(ctx, userID)
	if err != nil {
		return err
	}
	return s.userRepo.LogoutLive(ctx, userID)
}

// RefreshAccessToken generates new access token
func (s *AuthService) RefreshAccessToken(ctx context.Context, refreshToken string) (string, *models.User, time.Time, error) {
	claims, err := security.ValidateToken(refreshToken, s.refreshSecret)
	if err != nil {
		return "", nil, time.Time{}, err
	}

	userID, err := security.ParseUserIDFromClaims(claims)
	if err != nil {
		return "", nil, time.Time{}, err
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return "", nil, time.Time{}, ErrUserNotFound
	}

	if user.TokenVersion != claims.TokenVersion {
		return "", nil, time.Time{}, errors.New("token invalidated")
	}

	accessToken, err := security.GenerateAccessToken(user, s.jwtSecret)
	accessTokenExpires := time.Now().Add(4 * time.Hour)
	user.AccessTokenExpiresAt = &accessTokenExpires

	return accessToken, user, accessTokenExpires, err
}

// GetUserProfile gets user profile
func (s *AuthService) GetUserProfile(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return nil, ErrUserNotFound
	}

	user.Password = ""
	user.RefreshToken = nil
	user.ResetPasswordToken = nil
	user.ResetPasswordExpires = nil

	return user, nil
}
