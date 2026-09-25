package tests

import (
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
)

// TestLastSeatRaceCondition verifies pessimistic row locking prevents overbooking
func TestLastSeatRaceCondition(t *testing.T) {
	// Initialize test configuration & database connection
	if err := config.Load(); err != nil {
		t.Skipf("Skipping integration test: failed to load config: %v", err)
	}
	if err := config.ConnectPostgres(); err != nil {
		t.Skipf("Skipping integration test: PostgreSQL unavailable: %v", err)
	}
	defer config.DisconnectPostgres()

	repo := repositories.NewOttodotRepository(config.DB)

	// 1. Create a test parent & 10 distinct test students
	parent := models.Parent{
		ID:    uuid.New(),
		Name:  "Concurrency Test Parent",
		Email: "race_test_parent_" + uuid.New().String()[:8] + "@ottodot.net",
	}
	config.DB.Create(&parent)

	students := make([]models.Student, 10)
	for i := 0; i < 10; i++ {
		students[i] = models.Student{
			ID:       uuid.New(),
			ParentID: parent.ID,
			Name:     "Race Student " + string(rune('A'+i)),
			Age:      8,
		}
		config.DB.Create(&students[i])
	}

	// 2. Create a test trial class with Capacity = 4 and initial EnrolledCount = 3 (1 seat remaining)
	testClass := models.TrialClass{
		ID:            uuid.New(),
		Title:         "Last-Seat Concurrency Test Class",
		Subject:       "Science",
		StartTime:     time.Now().Add(24 * time.Hour),
		Capacity:      4,
		EnrolledCount: 3,
	}
	config.DB.Create(&testClass)

	// Seed 3 existing confirmed bookings to fill 3/4 seats
	for i := 0; i < 3; i++ {
		b := models.Booking{
			ID:           uuid.New(),
			StudentID:    students[i].ID,
			TrialClassID: testClass.ID,
			Status:       models.BookingStatusConfirmed,
			PaymentToken: "pay_tok_test_seed_" + uuid.New().String()[:8],
		}
		config.DB.Create(&b)
	}

	// 3. Create 10 pending bookings for the remaining 7 students
	pendingBookings := make([]models.Booking, 7)
	for i := 0; i < 7; i++ {
		b, err := repo.CreateBooking(students[i+3].ID, testClass.ID)
		assert.NoError(t, err)
		pendingBookings[i] = *b
	}

	// 4. Launch 7 concurrent goroutines to execute payment processing simultaneously
	var wg sync.WaitGroup
	results := make(chan string, 7)

	for i := 0; i < 7; i++ {
		wg.Add(1)
		go func(b models.Booking) {
			defer wg.Done()
			updated, _, err := repo.ProcessPaymentTransaction(b.ID, "success")
			if err != nil {
				results <- "error"
				return
			}
			results <- updated.Status
		}(pendingBookings[i])
	}

	wg.Wait()
	close(results)

	// 5. Assert Race Results
	confirmedCount := 0
	failedCount := 0

	for res := range results {
		if res == models.BookingStatusConfirmed {
			confirmedCount++
		} else if res == models.BookingStatusPaymentFailed {
			failedCount++
		}
	}

	t.Logf("Race Test Results -> Confirmed: %d, Failed (Race Lost): %d", confirmedCount, failedCount)

	// ASSERTION: Exactly 1 goroutine gets confirmed (reaching capacity 4/4)
	assert.Equal(t, 1, confirmedCount, "Exactly ONE concurrent user must win the last remaining seat")
	assert.Equal(t, 6, failedCount, "All other concurrent users must be rejected with payment_failed")

	// ASSERTION: DB total confirmed count is exactly 4
	var dbConfirmedCount int64
	config.DB.Model(&models.Booking{}).
		Where("trial_class_id = ? AND status = ?", testClass.ID, models.BookingStatusConfirmed).
		Count(&dbConfirmedCount)

	assert.Equal(t, int64(4), dbConfirmedCount, "Total confirmed bookings in DB must NOT exceed capacity limit of 4")
}
