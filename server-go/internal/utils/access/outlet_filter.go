package access

import (
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
)

// OutletFilterResult contains the resolved outlet filter for GORM queries
type OutletFilterResult struct {
	HasAccess   bool
	IsAll       bool
	OutletIDs   []uuid.UUID
	SpecificID  *uuid.UUID
}

// AccessOutletFilter resolves outlet filter from query and user access rights
func AccessOutletFilter(queryOutlet string, accessibleOutlets []models.Outlet) OutletFilterResult {
	// === SUPER ADMIN / ALL OUTLET ===
	if accessibleOutlets == nil {
		if queryOutlet == "" {
			return OutletFilterResult{HasAccess: true, IsAll: true}
		}

		if uid, err := uuid.Parse(queryOutlet); err == nil {
			return OutletFilterResult{HasAccess: true, SpecificID: &uid}
		}
		
		// Note: Filtering by name should be handled in the repository/controller
		// using specific GORM where clauses.
		return OutletFilterResult{HasAccess: true, IsAll: true}
	}

	// === NO ACCESS ===
	if len(accessibleOutlets) == 0 {
		return OutletFilterResult{HasAccess: false}
	}

	allowedIDs := make([]uuid.UUID, 0, len(accessibleOutlets))
	for _, o := range accessibleOutlets {
		allowedIDs = append(allowedIDs, o.ID)
	}

	// === USER SEARCH SPECIFIC OUTLET ===
	if queryOutlet != "" {
		if uid, err := uuid.Parse(queryOutlet); err == nil {
			for _, allowedID := range allowedIDs {
				if allowedID == uid {
					return OutletFilterResult{HasAccess: true, SpecificID: &uid}
				}
			}
			return OutletFilterResult{HasAccess: false}
		}
	}

	// === NO SEARCH -> ALL ACCESSIBLE ===
	return OutletFilterResult{HasAccess: true, OutletIDs: allowedIDs}
}
