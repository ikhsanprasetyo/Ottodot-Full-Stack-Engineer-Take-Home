package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mileusna/useragent"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/internal/utils"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

type UserController struct {
	userRepo *repositories.UserRepository
}

func NewUserController(userRepo *repositories.UserRepository) *UserController {
	return &UserController{userRepo: userRepo}
}

// GetProfile godoc
func (c *UserController) GetProfile(ctx *gin.Context) {
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)

	user, err := c.userRepo.FindByIDWithPopulate(ctx.Request.Context(), userID)
	if err != nil {
		logger.Log.Error("Failed to get profile", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to retrieve profile")
		return
	}

	if user == nil {
		utils.ErrorResponse(ctx, http.StatusNotFound, "User not found")
		return
	}

	user.Password = ""
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// UpdateProfile godoc
func (c *UserController) UpdateProfile(ctx *gin.Context) {
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)

	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Username string `json:"username"`
		Phone    string `json:"phone"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request")
		return
	}

	updates := make(map[string]any)
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}

	user, err := c.userRepo.Update(ctx.Request.Context(), userID, updates)
	if err != nil {
		logger.Log.Error("Failed to update profile", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to update profile")
		return
	}

	user.Password = ""
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully",
		"data":    user,
	})
}

// ChangePassword godoc
func (c *UserController) ChangePassword(ctx *gin.Context) {
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)

	var req struct {
		OldPassword string `json:"oldPassword" binding:"required"`
		NewPassword string `json:"newPassword" binding:"required,min=6"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request")
		return
	}

	err := c.userRepo.ChangePassword(ctx.Request.Context(), userID, req.OldPassword, req.NewPassword)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, err.Error())
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password changed successfully",
	})
}

// SetLastSeen godoc
func (c *UserController) SetLastSeen(ctx *gin.Context) {
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)

	err := c.userRepo.SetLastSeen(ctx.Request.Context(), userID)
	if err != nil {
		logger.Log.Error("Failed to set last seen", zap.Error(err))
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}

// GetUsers admin godoc
func (c *UserController) GetUsers(ctx *gin.Context) {
	offset := utils.ParseInt64(ctx.Query("offset"), 0)
	limit := utils.ParseInt64(ctx.Query("limit"), 10)
	search := strings.TrimSpace(ctx.Query("search"))
	showDeleted := ctx.Query("show_deleted") == "true"
	sortBy := ctx.Query("sort")
	sortOrder := ctx.Query("order")

	users, total, err := c.userRepo.ListWithPopulate(ctx.Request.Context(), search, offset, limit, showDeleted, sortBy, sortOrder)
	if err != nil {
		logger.Log.Error("Failed to list users", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to retrieve users")
		return
	}

	for i := range users {
		users[i].Password = ""
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       users,
		"total":      total,
		"totalPages": (total + limit - 1) / limit,
	})
}

// GetUserByID admin godoc
func (c *UserController) GetUserByID(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid user ID")
		return
	}

	user, err := c.userRepo.FindByIDWithPopulate(ctx.Request.Context(), id)
	if err != nil {
		logger.Log.Error("Failed to get user", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to retrieve user")
		return
	}

	if user == nil {
		utils.ErrorResponse(ctx, http.StatusNotFound, "User not found")
		return
	}

	user.Password = ""
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// CreateUser admin godoc
func (c *UserController) CreateUser(ctx *gin.Context) {
	var user models.User
	if err := ctx.ShouldBindJSON(&user); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request")
		return
	}

	user.ID = uuid.New()
	err := c.userRepo.Create(ctx.Request.Context(), &user)
	if err != nil {
		logger.Log.Error("Failed to create user", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to create user")
		return
	}

	user.Password = ""
	ctx.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    user,
	})
}

// UpdateUser admin godoc
func (c *UserController) UpdateUser(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var updates map[string]interface{}
	if err := ctx.ShouldBindJSON(&updates); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request")
		return
	}

	// Remove sensitive and system fields to prevent SQL conflicts and security issues
	delete(updates, "password")
	delete(updates, "id")
	delete(updates, "_id")
	delete(updates, "created_at")
	delete(updates, "createdAt")
	delete(updates, "updated_at")
	delete(updates, "updatedAt")
	delete(updates, "deleted_at")
	delete(updates, "deletedAt")

	// Remove virtual/association fields that are not DB columns
	delete(updates, "outletDoc")
	delete(updates, "positionDoc")
	delete(updates, "lastLogins")
	delete(updates, "liveLogin")
	delete(updates, "activity")
	delete(updates, "lastSeenAt")
	delete(updates, "lastLoginAt")
	delete(updates, "accessToken")
	delete(updates, "refreshToken")
	delete(updates, "tokenExpiresIn")
	delete(updates, "accessTokenExpiresAt")

	// Handle mapping and UUID validation for specific fields
	mappings := []struct {
		old      string
		new      string
		isUUID   bool
	}{
		{"outlet", "outlet_id", true},
		{"position", "position_id", true},
		{"outletAccessMode", "outlet_access_mode", false},
		{"roleApproval", "role_approval", false},
	}
	for _, m := range mappings {
		if val, ok := updates[m.old]; ok {
			if m.isUUID {
				if str, ok := val.(string); ok {
					if str == "" {
						updates[m.new] = nil
					} else {
						if _, err := uuid.Parse(str); err != nil {
							utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid UUID format for "+m.old)
							return
						}
						updates[m.new] = str
					}
				} else {
					updates[m.new] = val
				}
			} else {
				// Non-UUID string fields (e.g. outletAccessMode)
				updates[m.new] = val
			}
			delete(updates, m.old)
		}
	}

	// Handle outletAccess (JSONB slice of UUIDs)
	if val, ok := updates["outletAccess"]; ok {
		if slice, ok := val.([]any); ok {
			var uuids []uuid.UUID
			for _, item := range slice {
				if s, ok := item.(string); ok {
					if u, err := uuid.Parse(s); err == nil {
						uuids = append(uuids, u)
					}
				}
			}
			updates["outlet_access"] = models.JSONBUUIDList{Val: uuids}
		} else {
			// fallback for empty or non-array types
			updates["outlet_access"] = models.JSONBUUIDList{Val: []uuid.UUID{}}
		}
		delete(updates, "outletAccess")
	}

	user, err := c.userRepo.Update(ctx.Request.Context(), id, updates)
	if err != nil {
		logger.Log.Error("Failed to update user", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to update user: "+err.Error())
		return
	}

	user.Password = ""
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// DeleteUser admin godoc
func (c *UserController) DeleteUser(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid user ID")
		return
	}

	err = c.userRepo.SoftDelete(ctx.Request.Context(), id)
	if err != nil {
		logger.Log.Error("Failed to delete user", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to delete user")
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User deleted successfully",
	})
}

// RestoreUser admin godoc
func (c *UserController) RestoreUser(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid user ID")
		return
	}

	err = c.userRepo.Restore(ctx.Request.Context(), id)
	if err != nil {
		logger.Log.Error("Failed to restore user", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to restore user: "+err.Error())
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User restored successfully",
	})
}

// HardDeleteUser admin godoc
func (c *UserController) HardDeleteUser(ctx *gin.Context) {
	id, err := uuid.Parse(ctx.Param("id"))
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid user ID")
		return
	}

	err = c.userRepo.HardDelete(ctx.Request.Context(), id)
	if err != nil {
		logger.Log.Error("Failed to permanently delete user", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to permanently delete user")
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User permanently deleted",
	})
}

// GetUserOnlineHistory returns the historical active user counts
func (c *UserController) GetUserOnlineHistory(ctx *gin.Context) {
	var activities []models.UserOnlineHistory
	query := config.DB.Model(&models.UserOnlineHistory{})

	timeframe := ctx.Query("timeframe")

	// Determine the start time based on timeframe
	var startTime time.Time
	now := time.Now()

	switch timeframe {
	case "4h":
		startTime = now.Add(-4 * time.Hour)
	case "1d":
		startTime = now.Add(-24 * time.Hour)
	case "1w":
		startTime = now.Add(-7 * 24 * time.Hour)
	case "1m":
		startTime = now.Add(-30 * 24 * time.Hour)
	case "3m":
		startTime = now.Add(-90 * 24 * time.Hour)
	default:
		startTime = now.Add(-24 * time.Hour)
	}

	query = query.Where("timestamp >= ?", startTime).Order("timestamp asc")

	if err := query.Find(&activities).Error; err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to fetch activity history")
		return
	}

	// Append the LIVE current data point from heartbeats
	var liveActive struct {
		Total     int64
		UserNames string
	}
	oneMinuteAgo := now.Add(-1 * time.Minute)
	config.DB.Model(&models.User{}).
		Joins("JOIN user_activities ON user_activities.user_id = users.id").
		Select("count(*) as total, string_agg(username, ', ') as user_names").
		Where("user_activities.is_online = ? AND users.is_deleted = false AND user_activities.last_seen_at >= ?", true, oneMinuteAgo).
		Scan(&liveActive)

	activities = append(activities, models.UserOnlineHistory{
		ActiveCount: int(liveActive.Total),
		UserNames:   liveActive.UserNames,
		Timestamp:   now,
	})

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    activities,
	})
}

// GetUserStats returns summary statistics of users (total, online, new last 24h)
func (c *UserController) GetUserStats(ctx *gin.Context) {
	var totalUsers int64
	var onlineUsers int64
	var newUsers24h int64

	// Count total active (non-deleted) users
	if err := config.DB.Model(&models.User{}).Where("is_deleted = ?", false).Count(&totalUsers).Error; err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to count total users")
		return
	}

	// Count currently online users
	now := time.Now()
	oneMinuteAgo := now.Add(-1 * time.Minute)
	if err := config.DB.Model(&models.User{}).
		Joins("JOIN user_activities ON user_activities.user_id = users.id").
		Where("user_activities.is_online = ? AND users.is_deleted = false AND user_activities.last_seen_at >= ?", true, oneMinuteAgo).
		Count(&onlineUsers).Error; err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to count online users")
		return
	}

	// Count new users registered in the last 24 hours
	yesterday := now.Add(-24 * time.Hour)
	if err := config.DB.Model(&models.User{}).
		Where("created_at >= ? AND is_deleted = ?", yesterday, false).
		Count(&newUsers24h).Error; err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to count new users")
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"totalUsers":  totalUsers,
			"onlineUsers": onlineUsers,
			"newUsers24h": newUsers24h,
		},
	})
}

// UpdateLiveLogin updates user live login state and geocoded location
func (c *UserController) UpdateLiveLogin(ctx *gin.Context) {
	uID, _ := ctx.Get("userID")
	userID := uID.(uuid.UUID)

	var req models.Location
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body")
		return
	}

	ua := useragent.Parse(ctx.Request.UserAgent())
	now := time.Now()

	hasRealLocation := req.Latitude != nil || req.Longitude != nil || req.DisplayName != nil || req.City != nil || req.Region != nil || req.Country != nil
	clientIP := ctx.ClientIP()

	if clientIP == "127.0.0.1" || clientIP == "::1" || clientIP == "" {
		if geo, err := utils.GetGeoIP(clientIP); err == nil && geo != nil && geo.Query != "" {
			clientIP = geo.Query
			if !hasRealLocation {
				req.City = &geo.City
				req.Region = &geo.RegionName
				req.Country = &geo.Country
				req.Latitude = &geo.Lat
				req.Longitude = &geo.Lon
				hasRealLocation = true
			}
		}
	} else if !hasRealLocation {
		if geo, err := utils.GetGeoIP(clientIP); err == nil && geo != nil {
			req.City = &geo.City
			req.Region = &geo.RegionName
			req.Country = &geo.Country
			req.Latitude = &geo.Lat
			req.Longitude = &geo.Lon
			hasRealLocation = true
		}
	}

	isGPS := req.Latitude != nil || req.Longitude != nil || req.Accuracy != nil
	sourceStr := "geoip"
	if isGPS {
		sourceStr = "gps"
	}
	if req.Source == nil {
		req.Source = &sourceStr
	}
	if req.IsGPS == nil {
		req.IsGPS = &isGPS
	}

	liveLogin := &models.LiveLogin{
		IP:       clientIP,
		Location: &req,
		Device: &models.DeviceInfo{
			UA: ctx.Request.UserAgent(),
			Browser: &models.BrowserInfo{
				Name:    &ua.Name,
				Version: &ua.Version,
			},
			OS: &models.OSInfo{
				Name:    &ua.OS,
				Version: &ua.OSVersion,
			},
		},
		LastSeenAt: &now,
		IsOnline:   true,
	}

	if err := c.userRepo.UpdateLiveLogin(ctx.Request.Context(), userID, liveLogin); err != nil {
		logger.Log.Error("Failed to update live login", zap.Error(err))
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to update live login")
		return
	}

	// Update the absolute first entry in last_logins history list only if we have a real location to update with
	if hasRealLocation {
		if err := c.userRepo.UpdateLatestLoginLocation(ctx.Request.Context(), userID, &req, clientIP, liveLogin.Device); err != nil {
			logger.Log.Error("Failed to update latest login location history", zap.Error(err))
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}
