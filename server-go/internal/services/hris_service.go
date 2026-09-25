package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
)

type HRISService interface {
	GetHRISOperationsDetails(ctx context.Context, outletID uuid.UUID, month, year int) (*models.HRISOperationsDetails, error)
}

type hrisService struct {
	hrisRepo   repositories.HRISRepository
	outletRepo *repositories.OutletRepository
}

func NewHRISService(hrisRepo repositories.HRISRepository, outletRepo *repositories.OutletRepository) HRISService {
	return &hrisService{
		hrisRepo:   hrisRepo,
		outletRepo: outletRepo,
	}
}

// GetHRISOperationsDetails combines data from different HRIS summaries for the KPI detail view
func (s *hrisService) GetHRISOperationsDetails(ctx context.Context, outletID uuid.UUID, month, year int) (*models.HRISOperationsDetails, error) {
	// 1. Get outlet info to get the string name
	outlet, err := s.outletRepo.FindByID(ctx, outletID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch outlet: %v", err)
	}
	if outlet == nil {
		return nil, fmt.Errorf("outlet not found")
	}

	// 2. Fetch data from MongoDB repository using the outlet label and month/year
	// Use outlet.Label instead of outlet.Name because Name can contain hyphens (e.g. taman-teman) 
	// while HRIS stores strings with spaces (e.g. TAMAN TEMAN).
	details, err := s.hrisRepo.GetHRISOperationsDetails(ctx, outlet.Label, month, year)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch HRIS records: %v", err)
	}

	// 3. Map outlet settings to details
	details.Summary.TotalShiftPerDay = outlet.TotalShiftPerDay

	return details, nil
}
