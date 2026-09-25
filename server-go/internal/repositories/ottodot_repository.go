package repositories

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type OttodotRepository struct {
	db *gorm.DB
}

func NewOttodotRepository(db *gorm.DB) *OttodotRepository {
	return &OttodotRepository{db: db}
}

// GetAllClasses fetches all active trial classes with calculated remaining seats
func (r *OttodotRepository) GetAllClasses() ([]models.TrialClass, error) {
	var classes []models.TrialClass
	err := r.db.Order("start_time ASC").Find(&classes).Error
	return classes, err
}

// GetClassByID fetches a single class
func (r *OttodotRepository) GetClassByID(id uuid.UUID) (*models.TrialClass, error) {
	var class models.TrialClass
	err := r.db.First(&class, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &class, nil
}

// CreateClass creates a new trial class with dynamic capacity
func (r *OttodotRepository) CreateClass(class *models.TrialClass) error {
	return r.db.Create(class).Error
}

// UpdateClass Updates class details and dynamic capacity
func (r *OttodotRepository) UpdateClass(id uuid.UUID, req models.UpdateClassCapacityRequest) (*models.TrialClass, error) {
	var class models.TrialClass
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&class, "id = ?", id).Error; err != nil {
			return err
		}

		// Count current confirmed bookings
		var confirmedCount int64
		tx.Model(&models.Booking{}).Where("trial_class_id = ? AND status = ?", id, models.BookingStatusConfirmed).Count(&confirmedCount)

		if int64(req.Capacity) < confirmedCount {
			return fmt.Errorf("cannot reduce capacity to %d; class already has %d confirmed students", req.Capacity, confirmedCount)
		}

		class.Title = req.Title
		class.Subject = req.Subject
		class.StartTime = req.StartTime
		class.Capacity = req.Capacity
		class.UpdatedAt = time.Now().UTC()

		return tx.Save(&class).Error
	})

	if err != nil {
		return nil, err
	}
	return &class, nil
}

// GetConfirmedBookingForStudent checks if student already has a confirmed booking for this class
func (r *OttodotRepository) GetConfirmedBookingForStudent(studentID, classID uuid.UUID) (*models.Booking, error) {
	var booking models.Booking
	err := r.db.Where("student_id = ? AND trial_class_id = ? AND status = ?", studentID, classID, models.BookingStatusConfirmed).First(&booking).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &booking, err
}

// CreateBooking creates a pending booking
func (r *OttodotRepository) CreateBooking(studentID, classID uuid.UUID) (*models.Booking, error) {
	// First check if student already has confirmed booking
	existing, err := r.GetConfirmedBookingForStudent(studentID, classID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("DUPLICATE_CONFIRMED_BOOKING: Child already has a confirmed booking for this class")
	}

	paymentToken := fmt.Sprintf("pay_tok_%s_%d", uuid.New().String()[:8], time.Now().Unix())

	booking := models.Booking{
		ID:           uuid.New(),
		StudentID:    studentID,
		TrialClassID: classID,
		Status:       models.BookingStatusPendingPayment,
		PaymentToken: paymentToken,
	}

	if err := r.db.Create(&booking).Error; err != nil {
		return nil, err
	}

	// Load associations
	r.db.Preload("Student").Preload("TrialClass").First(&booking, "id = ?", booking.ID)

	return &booking, nil
}

// GetBookingByID fetches booking details
func (r *OttodotRepository) GetBookingByID(id uuid.UUID) (*models.Booking, error) {
	var booking models.Booking
	err := r.db.Preload("Student").Preload("TrialClass").First(&booking, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &booking, nil
}

// ProcessPaymentTransaction executes payment logic with Pessimistic Row Locking (FOR UPDATE)
// Atomically handles the Last-Seat Race Condition and guarantees capacity dynamic enforcement
func (r *OttodotRepository) ProcessPaymentTransaction(bookingID uuid.UUID, simulateOutcome string) (*models.Booking, *models.PaymentAttempt, error) {
	var updatedBooking models.Booking
	var paymentAttempt models.PaymentAttempt

	err := r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Fetch booking inside transaction
		var booking models.Booking
		if err := tx.First(&booking, "id = ?", bookingID).Error; err != nil {
			return fmt.Errorf("booking not found: %w", err)
		}

		if booking.Status == models.BookingStatusConfirmed {
			updatedBooking = booking
			return nil // Already confirmed
		}

		// 2. Lock TrialClass row with PESSIMISTIC ROW LOCK (FOR UPDATE)
		var class models.TrialClass
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&class, "id = ?", booking.TrialClassID).Error; err != nil {
			return fmt.Errorf("trial class not found or lock failed: %w", err)
		}

		// 3. Handle Simulated Payment Failure Path
		if simulateOutcome == "fail_payment" {
			booking.Status = models.BookingStatusPaymentFailed
			booking.UpdatedAt = time.Now().UTC()
			if err := tx.Save(&booking).Error; err != nil {
				return err
			}

			paymentAttempt = models.PaymentAttempt{
				ID:            uuid.New(),
				BookingID:     booking.ID,
				Amount:        0.00,
				Status:        "failed",
				FailureReason: "PAYMENT_GATEWAY_DECLINED: Simulated payment declined by card issuer",
			}
			if err := tx.Create(&paymentAttempt).Error; err != nil {
				return err
			}

			updatedBooking = booking
			return nil
		}

		// 4. Handle Simulated Success Path -> Atomically Check Dynamic Capacity & Enrolled Count
		var confirmedCount int64
		if err := tx.Model(&models.Booking{}).
			Where("trial_class_id = ? AND status = ?", class.ID, models.BookingStatusConfirmed).
			Count(&confirmedCount).Error; err != nil {
			return err
		}

		// Check against DYNAMIC class capacity (no hardcoded 4!)
		if int(confirmedCount) >= class.Capacity {
			logger.Log.Warn("RACE CONDITION REJECTED: Class is full",
				zap.String("class_id", class.ID.String()),
				zap.Int64("confirmed_count", confirmedCount),
				zap.Int("capacity", class.Capacity),
				zap.String("booking_id", booking.ID.String()),
			)

			booking.Status = models.BookingStatusPaymentFailed
			booking.UpdatedAt = time.Now().UTC()
			if err := tx.Save(&booking).Error; err != nil {
				return err
			}

			paymentAttempt = models.PaymentAttempt{
				ID:            uuid.New(),
				BookingID:     booking.ID,
				Amount:        0.00,
				Status:        "failed",
				FailureReason: "CLASS_FULL_RACE_LOST: Last available seat was confirmed by another user immediately prior to your payment processing",
			}
			if err := tx.Create(&paymentAttempt).Error; err != nil {
				return err
			}

			updatedBooking = booking
			return nil
		}

		// 5. Seat is AVAILABLE! Confirm Booking & Increment Enrolled Count
		booking.Status = models.BookingStatusConfirmed
		booking.UpdatedAt = time.Now().UTC()
		if err := tx.Save(&booking).Error; err != nil {
			return err
		}

		// Recalculate enrolled_count accurately
		var newCount int64
		tx.Model(&models.Booking{}).Where("trial_class_id = ? AND status = ?", class.ID, models.BookingStatusConfirmed).Count(&newCount)
		class.EnrolledCount = int(newCount)
		class.UpdatedAt = time.Now().UTC()
		if err := tx.Save(&class).Error; err != nil {
			return err
		}

		// Record successful payment attempt
		paymentAttempt = models.PaymentAttempt{
			ID:        uuid.New(),
			BookingID: booking.ID,
			Amount:    0.00,
			Status:    "succeeded",
		}
		if err := tx.Create(&paymentAttempt).Error; err != nil {
			return err
		}

		updatedBooking = booking
		return nil
	})

	if err != nil {
		return nil, nil, err
	}

	// Reload associations
	r.db.Preload("Student").Preload("TrialClass").First(&updatedBooking, "id = ?", updatedBooking.ID)

	return &updatedBooking, &paymentAttempt, nil
}

// GetClassRoster returns all confirmed students for a trial class
func (r *OttodotRepository) GetClassRoster(classID uuid.UUID) (*models.TrialClass, []models.Booking, error) {
	var class models.TrialClass
	if err := r.db.First(&class, "id = ?", classID).Error; err != nil {
		return nil, nil, err
	}

	var bookings []models.Booking
	err := r.db.Preload("Student.Parent").
		Where("trial_class_id = ? AND status = ?", classID, models.BookingStatusConfirmed).
		Order("updated_at ASC").
		Find(&bookings).Error

	return &class, bookings, err
}

// GetParentsAndStudents returns all parents with their children for demo selector
func (r *OttodotRepository) GetParentsAndStudents() ([]models.Parent, error) {
	var parents []models.Parent
	err := r.db.Preload("Students").Find(&parents).Error
	return parents, err
}

// GetUserByEmail for Authentication
func (r *OttodotRepository) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// CreateUser for Register
func (r *OttodotRepository) CreateUser(user *models.User) error {
	return r.db.Create(user).Error
}
