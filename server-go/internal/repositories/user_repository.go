package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"github.com/yourusername/kpi-backend/pkg/security"
	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// FindByEmail finds a non-deleted user by email OR username
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Where("(email = ? OR username = ?) AND is_deleted = false", email, email).
		Take(&user).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

// FindByID finds a non-deleted user by UUID
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Activity").
		Where("id = ? AND is_deleted = false", id).
		Take(&user).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

// FindByIDWithPopulate finds a user and preloads Activity association
func (r *UserRepository) FindByIDWithPopulate(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Activity").
		Where("users.id = ? AND users.is_deleted = false", id).
		Take(&user).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

// Create inserts a new user with hashed password
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	hashedPassword, err := security.HashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashedPassword

	if user.Role == "" {
		user.Role = "user"
	}
	if user.RoleApproval == "" {
		user.RoleApproval = "no"
	}
	user.InventoryAccess = false
	user.TokenVersion = 0

	return r.db.WithContext(ctx).Create(user).Error
}

// Update updates fields of a user identified by UUID
func (r *UserRepository) Update(ctx context.Context, id uuid.UUID, updates map[string]any) (*models.User, error) {

	err := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", id).
		Updates(updates).Error
	if err != nil {
		return nil, err
	}
	return r.FindByID(ctx, id)
}

// UpdateWithoutTimestamps updates fields without touching updated_at
func (r *UserRepository) UpdateWithoutTimestamps(ctx context.Context, id uuid.UUID, updates map[string]any) error {
	return r.db.WithContext(ctx).Session(&gorm.Session{SkipHooks: true}).
		Model(&models.User{}).
		Where("id = ?", id).
		UpdateColumns(updates).Error
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID uuid.UUID, loginHistory models.LoginHistory) error {
	// Create map for history entry to ensure correct JSON keys
	entry := map[string]any{
		"loginAt":  loginHistory.LoginAt.Format(time.RFC3339),
		"ip":       loginHistory.IP,
		"location": loginHistory.Location,
		"device":   loginHistory.Device,
	}

	// Marshal to JSON to ensure PostgreSQL correctly receives it as jsonb
	entryJSON, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	return r.db.WithContext(ctx).Exec(`
		UPDATE users SET
			last_logins = (
				SELECT jsonb_agg(x) FROM (
					SELECT x FROM (
						SELECT jsonb_array_elements(COALESCE(last_logins, '[]'::jsonb)) AS x
						UNION ALL
						SELECT ?::jsonb AS x
					) s
					ORDER BY (x->>'loginAt') DESC
					LIMIT 100
				) t
			),
			last_login_at = NOW()
		WHERE id = ?`,
		string(entryJSON),
		userID,
	).Error
}

// UpdateLiveLogin updates the live session info
func (r *UserRepository) UpdateLiveLogin(ctx context.Context, userID uuid.UUID, liveLogin *models.LiveLogin) error {
	return r.UpdateWithoutTimestamps(ctx, userID, map[string]any{
		"live_login": models.JSONBLiveLogin{Val: liveLogin},
	})
}

// UpdateLatestLoginLocation updates the location of the absolute first login history item in the JSONB array or inserts a new entry if empty
func (r *UserRepository) UpdateLatestLoginLocation(ctx context.Context, userID uuid.UUID, location *models.Location, clientIP string, device *models.DeviceInfo) error {
	locationJSON, err := json.Marshal(location)
	if err != nil {
		return err
	}
	deviceJSON, err := json.Marshal(device)
	if err != nil {
		return err
	}

	return r.db.WithContext(ctx).Exec(`
		DO $$
		DECLARE
			v_logins JSONB;
			v_new_entry JSONB;
		BEGIN
			SELECT COALESCE(last_logins, '[]'::jsonb) INTO v_logins FROM users WHERE id = ?;

			IF jsonb_array_length(v_logins) = 0 THEN
				v_new_entry := jsonb_build_object(
					'loginAt', NOW(),
					'ip', ?,
					'location', ?::jsonb,
					'device', ?::jsonb
				);
				UPDATE users SET last_logins = jsonb_build_array(v_new_entry) WHERE id = ?;
			ELSE
				UPDATE users SET
					last_logins = jsonb_set(last_logins, '{0,location}', ?::jsonb)
				WHERE id = ?;
			END IF;
		END $$;
	`, userID, clientIP, string(locationJSON), string(deviceJSON), userID, string(locationJSON), userID).Error
}

// LogoutLive sets is_online = false inside live_login JSONB
func (r *UserRepository) LogoutLive(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Exec(`
		UPDATE users SET live_login = jsonb_set(COALESCE(live_login, '{}'), '{isOnline}', 'false')
		WHERE id = ?`, userID).Error
}

// SetOnlineStatus updates the isOnline flag in user_activities
func (r *UserRepository) SetOnlineStatus(ctx context.Context, userID uuid.UUID, online bool) error {
	logger.Log.Info("DB: Updating online status (partitioned)",
		zap.String("userId", userID.String()),
		zap.Bool("online", online))

	now := time.Now()
	// Use UPSERT: insert new activity or update existing narrow row
	err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.Assignments(map[string]any{"is_online": online, "last_seen_at": now}),
	}).Create(&models.UserActivity{
		UserID:     userID,
		IsOnline:   online,
		LastSeenAt: now,
	}).Error

	if err != nil {
		logger.Log.Error("DB: Failed to update online status", zap.Error(err))
	}
	
	return err
}

// ResetOnlineStatuses sets all users to offline (used on server startup)
func (r *UserRepository) ResetOnlineStatuses(ctx context.Context) error {
	return r.db.WithContext(ctx).Model(&models.UserActivity{}).
		Where("is_online = ?", true).
		Update("is_online", false).Error
}

// FindByResetToken finds a non-expired reset token
func (r *UserRepository) FindByResetToken(ctx context.Context, token string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Where("reset_password_token = ? AND reset_password_expires > ? AND is_deleted = false", token, time.Now()).
		Take(&user).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

// List lists users with optional search, pagination
func (r *UserRepository) List(ctx context.Context, search string, offset, limit int64, showDeleted bool, sortBy, sortOrder string) ([]*models.User, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.User{})
	if showDeleted {
		query = query.Where("is_deleted = true")
	} else {
		query = query.Where("is_deleted = false")
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ? OR email ILIKE ? OR username ILIKE ?", like, like, like)
	}

	// Dynamic sorting mapping
	columnMap := map[string]string{
		"name":       "name",
		"username":   "username",
		"email":      "email",
		"role":       "role",
		"created_at": "created_at",
	}

	sortCol, ok := columnMap[sortBy]
	if !ok {
		sortCol = "created_at"
	}
	if sortOrder == "" {
		sortOrder = "DESC"
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []*models.User
	err := query.Preload("Activity").
		Offset(int(offset)).Limit(int(limit)).
		Order(sortCol + " " + sortOrder).
		Find(&users).Error
	return users, total, err
}

// ListWithPopulate lists users with preloaded Outlet + Position and flat location fields
func (r *UserRepository) ListWithPopulate(ctx context.Context, search string, offset, limit int64, showDeleted bool, sortBy, sortOrder string) ([]*models.User, int64, error) {
	baseWhere := "users.is_deleted = ?"
	baseVal := false
	if showDeleted {
		baseVal = true
	}

	// Count query
	countQuery := r.db.WithContext(ctx).Model(&models.User{}).Where(baseWhere, baseVal)
	if search != "" {
		like := "%" + search + "%"
		countQuery = countQuery.Where("name ILIKE ? OR email ILIKE ? OR username ILIKE ?", like, like, like)
	}
	var total int64
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Dynamic sorting
	columnMap := map[string]string{
		"name":       "users.name",
		"username":   "users.username",
		"email":      "users.email",
		"role":       "users.role",
		"activity":   "user_activities.last_seen_at",
		"created_at": "users.created_at",
	}
	sortCol, ok := columnMap[sortBy]
	if !ok {
		sortCol = "users.created_at"
	}
	if sortOrder == "" {
		sortOrder = "DESC"
	}

	dataQuery := r.db.WithContext(ctx).Model(&models.User{}).Where(baseWhere, baseVal)
	if search != "" {
		like := "%" + search + "%"
		dataQuery = dataQuery.Where("name ILIKE ? OR email ILIKE ? OR username ILIKE ?", like, like, like)
	}
	if sortBy == "activity" {
		dataQuery = dataQuery.Joins("LEFT JOIN user_activities ON user_activities.user_id = users.id")
	}

	var users []*models.User
	err := dataQuery.
		Preload("Outlet").Preload("Position").Preload("Activity").
		Offset(int(offset)).Limit(int(limit)).
		Order(sortCol + " " + sortOrder).
		Find(&users).Error
	if err != nil {
		return nil, 0, err
	}

	// Post-process: populate flat location fields from already-parsed JSONB structs.
	// Priority: LiveLogin.Location (GPS/Nominatim from browser) > LiveLogin.Location root fields (GeoIP) > LastLogins[0].Location (GeoIP at login)
	for _, u := range users {
		var loc *models.Location

		// 1. Try LiveLogin.Location
		if lv := u.LiveLogin.Val; lv != nil && lv.Location != nil {
			loc = lv.Location
		}
		// 2. Fallback: last login history location
		if loc == nil {
			if hist := u.LastLogins.Val; len(hist) > 0 && hist[0].Location != nil {
				loc = hist[0].Location
			}
		}

		if loc == nil {
			continue
		}

		u.LastDisplayName = loc.DisplayName

		// Address fields (Nominatim nested)
		if loc.Address != nil {
			u.LastCity = firstNonNil(loc.Address.City, loc.Address.Town, loc.Address.Village, loc.Address.County)
			u.LastState = firstNonNil(loc.Address.State, loc.Address.Region)
			u.LastCountry = firstNonNil(loc.Address.Country)
		}
		// Root-level fields (GeoIP: City, Region, Country set directly at login)
		if u.LastCity == nil {
			u.LastCity = loc.City
		}
		if u.LastState == nil {
			u.LastState = loc.Region
		}
		// Reset TodayOnlineDuration if user's last_seen_at is not today
		now := time.Now()
		var lastSeen *time.Time
		if u.Activity != nil && !u.Activity.LastSeenAt.IsZero() {
			lastSeen = &u.Activity.LastSeenAt
		} else if u.LastSeenAt != nil && !u.LastSeenAt.IsZero() {
			lastSeen = u.LastSeenAt
		}
		if lastSeen == nil || lastSeen.Format("2006-01-02") != now.Format("2006-01-02") {
			u.TodayOnlineDuration = 0
		}
	}

	return users, total, err
}

// firstNonNil returns the first non-nil, non-empty string pointer from the list
func firstNonNil(ptrs ...*string) *string {
	for _, p := range ptrs {
		if p != nil && *p != "" {
			return p
		}
	}
	return nil
}

// SoftDelete soft-deletes a user
func (r *UserRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	user, err := r.FindByID(ctx, id)
	if err != nil || user == nil {
		return errors.New("user not found or already deleted")
	}

	now := time.Now()
	suffix := "-deleted-" + id.String()

	newUsername := user.Username
	if len(newUsername) < len(suffix) || newUsername[len(newUsername)-len(suffix):] != suffix {
		newUsername = newUsername + suffix
	}

	newEmail := user.Email
	if len(newEmail) < len(suffix) || newEmail[len(newEmail)-len(suffix):] != suffix {
		newEmail = newEmail + suffix
	}

	return r.UpdateWithoutTimestamps(ctx, id, map[string]any{
		"is_deleted": true,
		"deleted_at": now,
		"updated_at": now,
		"username":   newUsername,
		"email":      newEmail,
	})
}

// Restore restores a soft-deleted user
func (r *UserRepository) Restore(ctx context.Context, id uuid.UUID) error {
	var u models.User
	err := r.db.WithContext(ctx).Unscoped().Where("id = ?", id).First(&u).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("user not found")
		}
		return err
	}

	newUsername := u.Username
	if idx := strings.Index(newUsername, "-deleted-"); idx != -1 {
		newUsername = newUsername[:idx]
	}

	newEmail := u.Email
	if idx := strings.Index(newEmail, "-deleted-"); idx != -1 {
		newEmail = newEmail[:idx]
	}

	return r.UpdateWithoutTimestamps(ctx, id, map[string]any{
		"is_deleted": false,
		"deleted_at": nil,
		"username":   newUsername,
		"email":      newEmail,
	})
}

// HardDelete permanently deletes a user
func (r *UserRepository) HardDelete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Unscoped().Where("id = ?", id).Delete(&models.User{}).Error
}

// ChangePassword changes user password with verification
func (r *UserRepository) ChangePassword(ctx context.Context, id uuid.UUID, oldPassword, newPassword string) error {
	user, err := r.FindByID(ctx, id)
	if err != nil || user == nil {
		return errors.New("user not found")
	}

	if !security.CheckPasswordHash(oldPassword, user.Password) {
		return errors.New("old password incorrect")
	}

	hashed, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}

	return r.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", id).
		Update("password", hashed).Error
}

// SetLastSeen updates last_seen_at timestamp in user_activities
func (r *UserRepository) SetLastSeen(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	// Run UPSERT asynchronously to avoid blocking the HTTP response with network latency
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := r.db.WithContext(bgCtx).Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]any{"last_seen_at": now}),
		}).Create(&models.UserActivity{
			UserID:     id,
			LastSeenAt: now,
		}).Error

		if err != nil {
			logger.Log.Error("DB: Failed to update last_seen_at asynchronously", zap.Error(err))
		}
	}()
	return nil
}

// CheckEmailExists checks if non-deleted email exists
func (r *UserRepository) CheckEmailExists(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.User{}).
		Where("email = ? AND is_deleted = false", email).
		Count(&count).Error
	return count > 0, err
}

// CheckUsernameExists checks if non-deleted username exists
func (r *UserRepository) CheckUsernameExists(ctx context.Context, username string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.User{}).
		Where("username = ? AND is_deleted = false", username).
		Count(&count).Error
	return count > 0, err
}

// IncrementTokenVersion invalidates all tokens
func (r *UserRepository) IncrementTokenVersion(ctx context.Context, id uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", id).
		UpdateColumns(map[string]any{
			"token_version": gorm.Expr("token_version + 1"),
			"refresh_token": nil,
		}).Error
	if err != nil {
		logger.Log.Error("Failed to increment token version",
			zap.String("userID", id.String()),
			zap.Error(err),
		)
	}
	return err
}

// FindIn finds users by multiple UUIDs
func (r *UserRepository) FindIn(ctx context.Context, ids []uuid.UUID) ([]models.User, error) {
	if len(ids) == 0 {
		return []models.User{}, nil
	}
	var users []models.User
	err := r.db.WithContext(ctx).
		Where("id IN ?", ids).
		Find(&users).Error
	return users, err
}

// UpsertOnConflict uses ON CONFLICT DO NOTHING
func (r *UserRepository) UpsertOnConflict(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(user).Error
}

