package data

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedOttodotData populates synthetic seed data for demonstration and testing
func SeedOttodotData(db *gorm.DB) {
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount > 0 {
		fmt.Println("ℹ Ottodot seed data already initialized.")
		return
	}

	fmt.Println("🌱 Seeding Ottodot synthetic dataset...")

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)

	// 1. Seed Users (Admin and Parents)
	adminUser := models.User{
		ID:       uuid.New(),
		Name:     "Ottodot Admin",
		Email:    "admin@ottodot.net",
		Password: string(hashedPassword),
		Role:     "admin",
	}

	parentUser1 := models.User{
		ID:       uuid.New(),
		Name:     "Ikhsan Parent",
		Email:    "parent1@byteseeker.net",
		Password: string(hashedPassword),
		Role:     "parent",
	}

	parentUser2 := models.User{
		ID:       uuid.New(),
		Name:     "Sarah Jenkins",
		Email:    "parent2@byteseeker.net",
		Password: string(hashedPassword),
		Role:     "parent",
	}

	parentUser3 := models.User{
		ID:       uuid.New(),
		Name:     "David Miller",
		Email:    "parent3@byteseeker.net",
		Password: string(hashedPassword),
		Role:     "parent",
	}

	db.Create(&adminUser)
	db.Create(&parentUser1)
	db.Create(&parentUser2)
	db.Create(&parentUser3)

	// 2. Seed Parents
	p1 := models.Parent{
		ID:     uuid.New(),
		UserID: &parentUser1.ID,
		Name:   parentUser1.Name,
		Email:  parentUser1.Email,
		Phone:  "+628123456789",
	}
	p2 := models.Parent{
		ID:     uuid.New(),
		UserID: &parentUser2.ID,
		Name:   parentUser2.Name,
		Email:  parentUser2.Email,
		Phone:  "+628987654321",
	}
	p3 := models.Parent{
		ID:     uuid.New(),
		UserID: &parentUser3.ID,
		Name:   parentUser3.Name,
		Email:  parentUser3.Email,
		Phone:  "+628555666777",
	}
	db.Create(&p1)
	db.Create(&p2)
	db.Create(&p3)

	// 3. Seed Students
	s1 := models.Student{ID: uuid.New(), ParentID: p1.ID, Name: "Leo Prasetyo", Age: 8}
	s2 := models.Student{ID: uuid.New(), ParentID: p1.ID, Name: "Maya Prasetyo", Age: 10}
	s3 := models.Student{ID: uuid.New(), ParentID: p2.ID, Name: "Ethan Jenkins", Age: 7}
	s4 := models.Student{ID: uuid.New(), ParentID: p3.ID, Name: "Sophia Miller", Age: 9}
	s5 := models.Student{ID: uuid.New(), ParentID: p3.ID, Name: "Lucas Miller", Age: 6}

	db.Create(&s1)
	db.Create(&s2)
	db.Create(&s3)
	db.Create(&s4)
	db.Create(&s5)

	// 4. Seed Trial Classes
	now := time.Now().UTC()

	// Class A: 3 Confirmed Students (1 seat remaining out of 4) -> For Last-Seat Race Test
	classA := models.TrialClass{
		ID:            uuid.MustParse("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"),
		Title:         "Fun with Chemical Reactions (Live Science)",
		Subject:       "Science",
		StartTime:     now.Add(24 * time.Hour),
		Capacity:      4,
		EnrolledCount: 3,
	}

	// Class B: 0 Confirmed Students (4 seats available out of 4)
	classB := models.TrialClass{
		ID:            uuid.MustParse("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"),
		Title:         "Introduction to Space & Planets",
		Subject:       "Science",
		StartTime:     now.Add(48 * time.Hour),
		Capacity:      4,
		EnrolledCount: 0,
	}

	// Class C: Fully Booked (4/4 confirmed students, 0 seats left)
	classC := models.TrialClass{
		ID:            uuid.MustParse("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"),
		Title:         "Fun Geometry & Math Puzzles",
		Subject:       "Math",
		StartTime:     now.Add(72 * time.Hour),
		Capacity:      4,
		EnrolledCount: 4,
	}

	// Class D: Dynamic Capacity of 6 students (2 enrolled out of 6)
	classD := models.TrialClass{
		ID:            uuid.MustParse("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44"),
		Title:         "Python Code Kids: Algorithmic Thinking",
		Subject:       "Coding",
		StartTime:     now.Add(96 * time.Hour),
		Capacity:      6,
		EnrolledCount: 2,
	}

	db.Create(&classA)
	db.Create(&classB)
	db.Create(&classC)
	db.Create(&classD)

	// 5. Seed Confirmed Bookings for Class A (3 students confirmed)
	bA1 := models.Booking{
		ID:           uuid.New(),
		StudentID:    s2.ID,
		TrialClassID: classA.ID,
		Status:       models.BookingStatusConfirmed,
		PaymentToken: "pay_tok_seed_a1",
	}
	bA2 := models.Booking{
		ID:           uuid.New(),
		StudentID:    s3.ID,
		TrialClassID: classA.ID,
		Status:       models.BookingStatusConfirmed,
		PaymentToken: "pay_tok_seed_a2",
	}
	bA3 := models.Booking{
		ID:           uuid.New(),
		StudentID:    s4.ID,
		TrialClassID: classA.ID,
		Status:       models.BookingStatusConfirmed,
		PaymentToken: "pay_tok_seed_a3",
	}
	db.Create(&bA1)
	db.Create(&bA2)
	db.Create(&bA3)

	// Seed Confirmed Bookings for Class C (4 students confirmed - FULL)
	bC1 := models.Booking{ID: uuid.New(), StudentID: s1.ID, TrialClassID: classC.ID, Status: models.BookingStatusConfirmed, PaymentToken: "pay_tok_seed_c1"}
	bC2 := models.Booking{ID: uuid.New(), StudentID: s2.ID, TrialClassID: classC.ID, Status: models.BookingStatusConfirmed, PaymentToken: "pay_tok_seed_c2"}
	bC3 := models.Booking{ID: uuid.New(), StudentID: s3.ID, TrialClassID: classC.ID, Status: models.BookingStatusConfirmed, PaymentToken: "pay_tok_seed_c3"}
	bC4 := models.Booking{ID: uuid.New(), StudentID: s4.ID, TrialClassID: classC.ID, Status: models.BookingStatusConfirmed, PaymentToken: "pay_tok_seed_c4"}
	db.Create(&bC1)
	db.Create(&bC2)
	db.Create(&bC3)
	db.Create(&bC4)

	// Seed Confirmed Bookings for Class D (2 students confirmed out of 6)
	bD1 := models.Booking{ID: uuid.New(), StudentID: s1.ID, TrialClassID: classD.ID, Status: models.BookingStatusConfirmed, PaymentToken: "pay_tok_seed_d1"}
	bD2 := models.Booking{ID: uuid.New(), StudentID: s5.ID, TrialClassID: classD.ID, Status: models.BookingStatusConfirmed, PaymentToken: "pay_tok_seed_d2"}
	db.Create(&bD1)
	db.Create(&bD2)

	fmt.Println("✅ Ottodot synthetic dataset seeded successfully!")
}
