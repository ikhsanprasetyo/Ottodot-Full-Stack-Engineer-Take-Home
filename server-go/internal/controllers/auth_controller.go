package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/services"
	"github.com/yourusername/kpi-backend/internal/utils"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

type AuthController struct {
	authService  *services.AuthService
	emailService *services.EmailService
}

func NewAuthController(authService *services.AuthService, emailService *services.EmailService) *AuthController {
	return &AuthController{
		authService:  authService,
		emailService: emailService,
	}
}

// Login godoc
func (c *AuthController) Login(ctx *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request")
		return
	}

	res, err := c.authService.Login(ctx.Request.Context(), &services.LoginRequest{
		Email:     req.Email,
		Password:  req.Password,
		IP:        ctx.ClientIP(),
		UserAgent: ctx.Request.UserAgent(),
	})

	if err != nil {
		if err == services.ErrInvalidCredentials {
			utils.ErrorResponse(ctx, http.StatusUnauthorized, err.Error())
			return
		}
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Login failed")
		return
	}

	c.setTokenCookies(ctx, res.AccessToken, res.RefreshToken)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data": gin.H{
			"user":         res.User,
			"token":        res.AccessToken,
			"refreshToken": res.RefreshToken,
			// Flattened fields for saveUserSession
			"_id":                   res.User.ID,
			"name":                  res.User.Name,
			"username":              res.User.Username,
			"email":                 res.User.Email,
			"role":                  res.User.Role,
			"roleApproval":          res.User.RoleApproval,
			"lastLoginAt":           res.User.LastLoginAt,
			"accessTokenExpiresAt":  res.User.AccessTokenExpiresAt,
			"access":                res.User.Access,
			"outlet":                res.User.OutletID,
			"outletAccessMode":      res.User.OutletAccessMode,
			"outletAccess":          res.User.OutletAccess,
		},
	})
}

// Register godoc
func (c *AuthController) Register(ctx *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	res, err := c.authService.Register(ctx.Request.Context(), &services.RegisterRequest{
		Username:  req.Username,
		Name:      req.Name,
		Email:     req.Email,
		Password:  req.Password,
		IP:        ctx.ClientIP(),
		UserAgent: ctx.Request.UserAgent(),
	})

	if err != nil {
		if err == services.ErrEmailExists || err == services.ErrUsernameExists {
			utils.ErrorResponse(ctx, http.StatusConflict, err.Error())
			return
		}
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Registration failed: "+err.Error())
		return
	}

	c.setTokenCookies(ctx, res.AccessToken, res.RefreshToken)

	ctx.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "User registered successfully",
		"data": gin.H{
			"user":         res.User,
			"token":        res.AccessToken,
			"refreshToken": res.RefreshToken,
			// Flattened fields for saveUserSession
			"_id":                   res.User.ID,
			"name":                  res.User.Name,
			"username":              res.User.Username,
			"email":                 res.User.Email,
			"role":                  res.User.Role,
			"roleApproval":          res.User.RoleApproval,
			"lastLoginAt":           res.User.LastLoginAt,
			"accessTokenExpiresAt":  res.User.AccessTokenExpiresAt,
			"access":                res.User.Access,
			"outlet":                res.User.OutletID,
			"outletAccessMode":      res.User.OutletAccessMode,
			"outletAccess":          res.User.OutletAccess,
		},
	})
}

// ForgotPasswordRequest matching Node.js
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ForgotPassword godoc
func (c *AuthController) ForgotPassword(ctx *gin.Context) {
	var req ForgotPasswordRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request")
		return
	}

	resetToken, err := c.authService.ForgotPassword(ctx.Request.Context(), req.Email)
	if err != nil {
		if err == services.ErrUserNotFound {
			utils.ErrorResponse(ctx, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to process forgot password")
		return
	}

	// Send email asynchronously so we don't block the response
	go func() {
		err := c.emailService.SendResetPasswordEmail(req.Email, resetToken)
		if err != nil {
			logger.Log.Error("Failed to send reset password email", 
				zap.String("email", req.Email), 
				zap.Error(err),
			)
		}
	}()

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password reset link has been sent to your email",
	})
}

// ResetPasswordRequest matching Node.js
type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

// ResetPassword godoc
func (c *AuthController) ResetPassword(ctx *gin.Context) {
	token := ctx.Param("token")
	if token == "" {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Reset token is required")
		return
	}

	var req ResetPasswordRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request")
		return
	}

	err := c.authService.ResetPassword(ctx.Request.Context(), &services.ResetPasswordRequest{
		Token:       token,
		NewPassword: req.Password,
	})

	if err != nil {
		if err == services.ErrInvalidResetToken {
			utils.ErrorResponse(ctx, http.StatusBadRequest, err.Error())
			return
		}
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to reset password")
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password updated successfully",
	})
}

// RefreshToken godoc
func (c *AuthController) RefreshToken(ctx *gin.Context) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}

	// Try to bind from JSON first
	_ = ctx.ShouldBindJSON(&req)

	// If not in JSON, try to get from cookie
	if req.RefreshToken == "" {
		cookieToken, err := ctx.Cookie("refreshToken")
		if err == nil {
			req.RefreshToken = cookieToken
		}
	}

	if req.RefreshToken == "" {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Refresh token is required")
		return
	}

	accessToken, user, _, err := c.authService.RefreshAccessToken(ctx.Request.Context(), req.RefreshToken)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusUnauthorized, "Invalid refresh token")
		return
	}

	// Update access token cookie
	ctx.SetCookie("accessToken", accessToken, 4*60*60, "/", "", false, true)

	// Inject accessToken into user object for frontend handleTokenRefresh
	userMap := gin.H{
		"_id":                  user.ID,
		"name":                 user.Name,
		"username":             user.Username,
		"email":                user.Email,
		"role":                 user.Role,
		"roleApproval":         user.RoleApproval,
		"accessToken":          accessToken, // This is expected by frontend handleTokenRefresh
		"accessTokenExpiresAt": user.AccessTokenExpiresAt,
		"access":               user.Access,
		"outlet":               user.OutletID,
		"outletAccessMode":     user.OutletAccessMode,
		"outletAccess":         user.OutletAccess,
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Token refreshed successfully",
		"user":    userMap,
		"data": gin.H{
			"token": accessToken,
			"user":  userMap,
		},
	})
}

// Logout godoc
func (c *AuthController) Logout(ctx *gin.Context) {
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)

	if err := c.authService.Logout(ctx.Request.Context(), userID); err != nil {
		logger.Log.Error("Failed to logout", zap.Error(err))
	}

	// Clear cookies
	ctx.SetCookie("accessToken", "", -1, "/", "", false, true)
	ctx.SetCookie("refreshToken", "", -1, "/", "", false, true)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

func (c *AuthController) setTokenCookies(ctx *gin.Context, accessToken, refreshToken string) {
	// Access token: 4 hours
	ctx.SetCookie("accessToken", accessToken, 4*60*60, "/", "", false, true)
	// Refresh token: 30 days
	ctx.SetCookie("refreshToken", refreshToken, 30*24*60*60, "/", "", false, true)
}

// GetProfile godoc
func (c *AuthController) GetProfile(ctx *gin.Context) {
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)

	user, err := c.authService.GetUserProfile(ctx.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusNotFound, "User not found")
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile retrieved successfully",
		"data":    user,
	})
}
