package worker

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
	"gorm.io/gorm"
)

func StartUserOnlineWorker(ctx context.Context) {
	log.Println("⚡ User Online Worker started")

	// Run every 10 seconds
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	// Run once immediately on startup
	recordUserOnline(ctx, true)

	tickCount := 0
	for {
		select {
		case <-ticker.C:
			tickCount++
			// Write history log every 6 ticks (60 seconds)
			writeHistory := tickCount%6 == 0
			recordUserOnline(ctx, writeHistory)
		case <-ctx.Done():
			log.Println("⚡ User Online Worker stopped")
			return
		}
	}
}

var lastResetDate = ""

func recordUserOnline(ctx context.Context, writeHistory bool) {
	now := time.Now()
	currentDate := now.Format("2006-01-02")

	// 0. Reset today_online_duration at midnight or day change (handles server restarts)
	if lastResetDate == "" {
		lastResetDate = currentDate
		// Clean up outdated today_online_duration for users whose activity last_seen_at is not today
		config.DB.Exec(`
			UPDATE users SET today_online_duration = 0 
			WHERE id NOT IN (
				SELECT user_id FROM user_activities 
				WHERE TO_CHAR(last_seen_at, 'YYYY-MM-DD') = ?
			)
		`, currentDate)
	}

	if currentDate != lastResetDate {
		log.Println("🔄 Resetting TodayOnlineDuration for all users due to day change...")
		err := config.DB.Model(&models.User{}).UpdateColumn("today_online_duration", 0).Error
		if err != nil {
			log.Printf("❌ Failed to reset today_online_duration: %v", err)
		} else {
			log.Println("✓ TodayOnlineDuration reset successfully")
			lastResetDate = currentDate
		}
	}

	// 1. Update online duration for currently online users
	// Adds 10 seconds to both OnlineDuration and TodayOnlineDuration
	err := config.DB.Model(&models.User{}).
		Where("id IN (SELECT user_id FROM user_activities WHERE is_online = ? AND user_activities.last_seen_at >= ?)", true, now.Add(-5*time.Minute)).
		Updates(map[string]interface{}{
			"online_duration":       gorm.Expr("online_duration + 10"),
			"today_online_duration": gorm.Expr("today_online_duration + 10"),
		}).Error

	if err != nil {
		log.Printf("❌ Failed to update online duration for active users: %v", err)
	}

	if !writeHistory {
		return
	}

	// 2. Fetch usernames of currently online users
	var usernames []string
	err = config.DB.Model(&models.User{}).
		Joins("JOIN user_activities ON user_activities.user_id = users.id").
		Where("user_activities.is_online = ? AND users.is_deleted = false AND user_activities.last_seen_at >= ?", true, now.Add(-5*time.Minute)).
		Pluck("username", &usernames).Error

	if err != nil {
		log.Printf("❌ Failed to query active users for UserOnlineWorker: %v", err)
		return
	}

	// 3. Insert record into UserOnlineHistory
	history := models.UserOnlineHistory{
		ActiveCount: len(usernames),
		UserNames:   strings.Join(usernames, ", "),
		Timestamp:   now,
	}

	if err := config.DB.Create(&history).Error; err != nil {
		log.Printf("❌ Failed to insert UserOnlineHistory: %v", err)
	} else {
		fmt.Printf("📊 UserOnlineWorker: Recorded %d active online users (%s)\n", len(usernames), history.UserNames)
	}
}
