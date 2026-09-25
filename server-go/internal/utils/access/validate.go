package access

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
)

var (
	ErrInvalidOutletAccessMode = errors.New("invalid outletAccessMode")
	ErrOutletAccessNotArray    = errors.New("outletAccess must be an array for mode 'multiple'")
	ErrOutletAccessEmpty       = errors.New("outletAccess cannot be empty when mode is multiple")
	ErrInvalidOutletIDs        = errors.New("one or more outletAccess IDs are invalid")
)

var AllowedOutletAccessModes = []string{"single", "multiple", "all"}

// OutletAccessResult contains normalized outlet access data using UUIDs
type OutletAccessResult struct {
	OutletAccessMode string
	OutletAccess     []uuid.UUID
}

// ValidateOutletAccess validates and normalizes outlet access payload
func ValidateOutletAccess(outletAccessMode string, outletAccess []string) (*OutletAccessResult, error) {
	// Mode validation
	validMode := false
	for _, mode := range AllowedOutletAccessModes {
		if mode == outletAccessMode {
			validMode = true
			break
		}
	}
	if !validMode {
		return nil, ErrInvalidOutletAccessMode
	}

	// Default normalized result
	normalizedOutletAccess := []uuid.UUID{}

	// Only "multiple" mode should have array
	if outletAccessMode == "multiple" {
		if outletAccess == nil {
			return nil, ErrOutletAccessNotArray
		}

		if len(outletAccess) == 0 {
			return nil, ErrOutletAccessEmpty
		}

		// Convert strings to UUIDs
		outletUUIDs := make([]uuid.UUID, 0, len(outletAccess))
		for _, id := range outletAccess {
			uid, err := uuid.Parse(id)
			if err != nil {
				return nil, ErrInvalidOutletIDs
			}
			outletUUIDs = append(outletUUIDs, uid)
		}

		// Validate outlet IDs exist in database using GORM
		var count int64
		err := config.DB.WithContext(context.Background()).Model(&models.Outlet{}).
			Where("id IN ? AND is_deleted = false", outletUUIDs).
			Count(&count).Error
		
		if err != nil {
			return nil, err
		}

		if count != int64(len(outletUUIDs)) {
			return nil, ErrInvalidOutletIDs
		}

		normalizedOutletAccess = outletUUIDs
	}

	return &OutletAccessResult{
		OutletAccessMode: outletAccessMode,
		OutletAccess:     normalizedOutletAccess,
	}, nil
}
