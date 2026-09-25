package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents user account for Authentication (Parent or Admin)
type User struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string         `gorm:"type:varchar(255);not null" json:"name"`
	Email     string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Password  string         `gorm:"type:varchar(255);not null" json:"-"`
	Role      string         `gorm:"type:varchar(50);not null;default:'parent'" json:"role"` // 'parent' or 'admin'
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Parent represents synthetic/real parent entity
type Parent struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    *uuid.UUID `gorm:"type:uuid" json:"user_id,omitempty"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	Email     string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Phone     string    `gorm:"type:varchar(50)" json:"phone"`
	CreatedAt time.Time `json:"created_at"`
	Students  []Student `gorm:"foreignKey:ParentID" json:"students,omitempty"`
}

// Student represents a child belonging to a Parent
type Student struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ParentID  uuid.UUID `gorm:"type:uuid;not null;index" json:"parent_id"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	Age       int       `gorm:"type:int;not null" json:"age"`
	CreatedAt time.Time `json:"created_at"`
	Parent    *Parent   `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
}

// TrialClass represents a live online Science/Math trial class session with dynamic capacity
type TrialClass struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Title         string    `gorm:"type:varchar(255);not null" json:"title"`
	Subject       string    `gorm:"type:varchar(50);not null" json:"subject"` // Science, Math, Coding
	StartTime     time.Time `gorm:"not null" json:"start_time"`
	Capacity      int       `gorm:"type:int;not null;default:4" json:"capacity"` // Dynamic student limit per class
	EnrolledCount int       `gorm:"type:int;not null;default:0" json:"enrolled_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// BookingStatus constants
const (
	BookingStatusPendingPayment = "pending_payment"
	BookingStatusConfirmed      = "confirmed"
	BookingStatusPaymentFailed  = "payment_failed"
	BookingStatusCancelled      = "cancelled"
	BookingStatusExpired        = "expired"
)

// Booking represents a trial class booking
type Booking struct {
	ID           uuid.UUID   `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	StudentID    uuid.UUID   `gorm:"type:uuid;not null;index" json:"student_id"`
	TrialClassID uuid.UUID   `gorm:"type:uuid;not null;index" json:"trial_class_id"`
	Status       string      `gorm:"type:varchar(50);not null;default:'pending_payment'" json:"status"`
	PaymentToken string      `gorm:"type:varchar(255);uniqueIndex;not null" json:"payment_token"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	Student      *Student    `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	TrialClass   *TrialClass `gorm:"foreignKey:TrialClassID" json:"trial_class,omitempty"`
}

// PaymentAttempt represents audit log of mock payment execution
type PaymentAttempt struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	BookingID     uuid.UUID `gorm:"type:uuid;not null;index" json:"booking_id"`
	Amount        float64   `gorm:"type:numeric(10,2);not null;default:0.00" json:"amount"`
	Status        string    `gorm:"type:varchar(50);not null" json:"status"` // 'pending', 'succeeded', 'failed'
	FailureReason string    `gorm:"type:text" json:"failure_reason,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

// DTO Requests & Responses
type CreateBookingRequest struct {
	StudentID    uuid.UUID `json:"student_id" binding:"required"`
	TrialClassID uuid.UUID `json:"trial_class_id" binding:"required"`
}

type ProcessPaymentRequest struct {
	BookingID       uuid.UUID `json:"booking_id" binding:"required"`
	PaymentToken    string    `json:"payment_token" binding:"required"`
	SimulateOutcome string    `json:"simulate_outcome" binding:"required"` // "success" or "fail_payment"
}

type UpdateClassCapacityRequest struct {
	Title     string    `json:"title" binding:"required"`
	Subject   string    `json:"subject" binding:"required"`
	StartTime time.Time `json:"start_time" binding:"required"`
	Capacity  int       `json:"capacity" binding:"required,gt=0"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
