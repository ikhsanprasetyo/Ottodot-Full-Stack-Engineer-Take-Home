package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"gorm.io/gorm"
)

type RTUDistributionService interface {
	CreateDistribution(ctx context.Context, dist *models.RTUDistribution, createdBy uuid.UUID) error
	UpdateDistribution(ctx context.Context, distID uuid.UUID, input *models.RTUDistribution, updatedBy uuid.UUID) error
	ShipDistribution(ctx context.Context, distID uuid.UUID, updatedBy uuid.UUID) error
	ReceiveDistribution(ctx context.Context, distID uuid.UUID, updatedBy uuid.UUID) error
	CancelDistribution(ctx context.Context, distID uuid.UUID, updatedBy uuid.UUID) error
}

type rtuDistributionService struct {
	db       *gorm.DB
	distRepo repositories.RTUDistributionRepository
}

func NewRTUDistributionService(db *gorm.DB, distRepo repositories.RTUDistributionRepository) RTUDistributionService {
	return &rtuDistributionService{
		db:       db,
		distRepo: distRepo,
	}
}

func (s *rtuDistributionService) CreateDistribution(ctx context.Context, dist *models.RTUDistribution, createdBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var srcAbbrev string
		if dist.SourceOutletID != nil && *dist.SourceOutletID != uuid.Nil {
			var srcOutlet models.Outlet
			if err := tx.Select("abbreviation").First(&srcOutlet, "id = ?", dist.SourceOutletID).Error; err == nil {
				if srcOutlet.Abbreviation != nil && *srcOutlet.Abbreviation != "" {
					srcAbbrev = *srcOutlet.Abbreviation
				}
			}
		}
                if dist.ShipmentDate == nil {
                        now := time.Now()
                        dist.ShipmentDate = &now
                }

                prefix := "OUT-"
                if srcAbbrev != "" {
                        prefix = fmt.Sprintf("OUT-%s-", srcAbbrev)
                }
                dist.DocNumber = fmt.Sprintf("%s%s-%s", prefix, dist.ShipmentDate.Format("20060102"), uuid.New().String()[:4])
                dist.Status = models.DistributionStatusShipped

                dist.CreatedBy = &createdBy
                dist.UpdatedBy = &createdBy

                if err := tx.Create(dist).Error; err != nil {
                        return err
                }

                // Auto-ship logic
                var sourceOutletID uuid.UUID
                if dist.SourceOutletID != nil {
                        sourceOutletID = *dist.SourceOutletID
                } else {
                        var ckOutlet models.Outlet
                        if err := tx.Where("type = ? AND is_deleted = false", "WAREHOUSE").First(&ckOutlet).Error; err != nil {
                                if err := tx.Where("is_deleted = false").Order("created_at ASC").First(&ckOutlet).Error; err != nil {
                                        return fmt.Errorf("no active warehouse/outlet found: %w", err)
                                }
                        }
                        sourceOutletID = ckOutlet.ID
                }

                now := *dist.ShipmentDate

                if dist.Type == models.DistributionTypeProduct || dist.Type == "" {
                        for i := range dist.Items {
                                item := &dist.Items[i]
                                if item.ProductID == nil {
                                        continue
                                }

                                var sourceProdStock models.RTUOutletProductStock
                                if err := tx.Where("product_id = ? AND outlet_id = ?", *item.ProductID, sourceOutletID).
                                        First(&sourceProdStock).Error; err != nil {
                                        return fmt.Errorf("source outlet has no stock record for product %s: %w", *item.ProductID, err)
                                }
                                if sourceProdStock.CurrentStock < item.Qty {
                                        var prod models.RTUProduct
                                        prodName := item.ProductID.String()
                                        if err := tx.Where("id = ?", *item.ProductID).First(&prod).Error; err == nil {
                                                prodName = prod.Name
                                        }
                                        return fmt.Errorf("insufficient product stock at source outlet for %s. Available: %.3f, Requested: %.3f",
                                                prodName, sourceProdStock.CurrentStock, item.Qty)
                                }

                                sourceProdStock.CurrentStock -= item.Qty
                                if err := tx.Save(&sourceProdStock).Error; err != nil {
                                        return fmt.Errorf("failed to deduct source product stock: %w", err)
                                }

                                totalCost, err := ConsumeFIFO(tx, sourceOutletID, *item.ProductID, true, item.Qty, "DISTRIBUTION", dist.ID, now)
                                if err != nil {
                                        return fmt.Errorf("failed to consume FIFO lot for product %s: %w", *item.ProductID, err)
                                }

                                if item.Qty > 0 {
                                        item.UnitPrice = totalCost / item.Qty
                                }
                                if err := tx.Save(item).Error; err != nil {
                                        return fmt.Errorf("failed to save distribution item unit price: %w", err)
                                }
                        }
                } else if dist.Type == models.DistributionTypeMaterial {
                        for i := range dist.Items {
                                item := &dist.Items[i]
                                if item.MaterialID == nil {
                                        continue
                                }

                                var sourceMatStock models.RTUOutletMaterialStock
                                if err := tx.Where("material_id = ? AND outlet_id = ?", *item.MaterialID, sourceOutletID).
                                        First(&sourceMatStock).Error; err != nil {
                                        return fmt.Errorf("source outlet has no stock record for material %s: %w", *item.MaterialID, err)
                                }
                                if sourceMatStock.CurrentStock < item.Qty {
                                        var mat models.RTUMaterial
                                        matName := item.MaterialID.String()
                                        if err := tx.Where("id = ?", *item.MaterialID).First(&mat).Error; err == nil {
                                                matName = mat.Name
                                        }
                                        return fmt.Errorf("insufficient material stock at source outlet for %s. Available: %.3f, Requested: %.3f",
                                                matName, sourceMatStock.CurrentStock, item.Qty)
                                }

                                sourceMatStock.CurrentStock -= item.Qty
                                if err := tx.Save(&sourceMatStock).Error; err != nil {
                                        return fmt.Errorf("failed to deduct source material stock: %w", err)
                                }

                                totalCost, err := ConsumeFIFO(tx, sourceOutletID, *item.MaterialID, false, item.Qty, "DISTRIBUTION", dist.ID, now)
                                if err != nil {
                                        return fmt.Errorf("failed to consume FIFO lot for material %s: %w", *item.MaterialID, err)
                                }

                                if item.Qty > 0 {
                                        item.UnitPrice = totalCost / item.Qty
                                }
                                if err := tx.Save(item).Error; err != nil {
                                        return fmt.Errorf("failed to save distribution item unit price: %w", err)
                                }
                        }
                }

                history := models.RTUDistributionHistory{
                        DistributionID: dist.ID,
                        Action:         "CREATED",
                        Changes:        "Distribution created and automatically SHIPPED",
                        PerformedBy:    &createdBy,
                }
                return tx.Create(&history).Error
        })
}

func (s *rtuDistributionService) UpdateDistribution(ctx context.Context, distID uuid.UUID, input *models.RTUDistribution, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		distRepoTx := s.distRepo.WithTransaction(tx)

		existing, err := distRepoTx.FindByID(ctx, distID)
		if err != nil {
			return err
		}
		if existing == nil {
			return errors.New("distribution not found")
		}
		if existing.Status != models.DistributionStatusShipped {
			return fmt.Errorf("cannot edit distribution in %s status, only SHIPPED can be edited", existing.Status)
		}

		oldDist := *existing

		// Reverse the previous stock consumption before updating
		// This simulates "cancelling" the old shipped items, and we'll "reship" below.
		now := time.Now()
		isProduct := existing.Type == models.DistributionTypeProduct || existing.Type == ""
		var sourceOutletID uuid.UUID
		if existing.SourceOutletID != nil {
			sourceOutletID = *existing.SourceOutletID
		} else {
			var ckOutlet models.Outlet
			if err := tx.Where("type = ? AND is_deleted = false", "WAREHOUSE").First(&ckOutlet).Error; err == nil {
				sourceOutletID = ckOutlet.ID
			}
		}
		
		for _, oldItem := range existing.Items {
			var itemID uuid.UUID
			if isProduct {
				if oldItem.ProductID == nil { continue }
				itemID = *oldItem.ProductID
				// Revert stock
				var sourceStock models.RTUOutletProductStock
				if err := tx.Where("product_id = ? AND outlet_id = ?", itemID, sourceOutletID).First(&sourceStock).Error; err == nil {
					sourceStock.CurrentStock += oldItem.Qty
					tx.Save(&sourceStock)
				}
			} else {
				if oldItem.MaterialID == nil { continue }
				itemID = *oldItem.MaterialID
				// Revert stock
				var sourceStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", itemID, sourceOutletID).First(&sourceStock).Error; err == nil {
					sourceStock.CurrentStock += oldItem.Qty
					tx.Save(&sourceStock)
				}
			}
			
			// Create reversal lot
			lotNumber := fmt.Sprintf("LOT-REV-DIST-EDIT-%s-%s-%s", now.Format("20060102"), existing.DocNumber, uuid.New().String()[:6])
			newLot := models.RTUStockLot{
				ID:           uuid.New(),
				OutletID:     sourceOutletID,
				LotNumber:    lotNumber,
				QtyInitial:   oldItem.Qty,
				QtyRemaining: oldItem.Qty,
				UnitPrice:    oldItem.UnitPrice,
				RefType:      "DISTRIBUTION_EDIT_REVERSAL",
				RefID:        existing.ID,
				ReceivedDate: now,
			}
			if isProduct {
				newLot.ProductID = &itemID
			} else {
				newLot.MaterialID = &itemID
			}
			ReconcileNewLot(tx, &newLot)
			tx.Create(&newLot)
		}

		// Delete existing items
		if err := tx.Where("distribution_id = ?", distID).Delete(&models.RTUDistributionItem{}).Error; err != nil {
			return fmt.Errorf("failed to clean up old items: %w", err)
		}

		// Update fields
		existing.SourceOutletID = input.SourceOutletID
		existing.OutletID = input.OutletID
		existing.Type = input.Type
		existing.Notes = input.Notes
		existing.UpdatedBy = &updatedBy
		if input.ShipmentDate != nil {
			existing.ShipmentDate = input.ShipmentDate
		}

		if err := tx.Omit("Items", "Outlet", "SourceOutlet").Save(existing).Error; err != nil {
			return err
		}

		// Re-initialize items and consume stock again
		newSourceOutletID := sourceOutletID
		if existing.SourceOutletID != nil {
			newSourceOutletID = *existing.SourceOutletID
		}

		for i := range input.Items {
			item := &input.Items[i]
			item.ID = uuid.New()
			item.DistributionID = distID

			// Consume new stock
			if existing.Type == models.DistributionTypeProduct || existing.Type == "" {
				if item.ProductID != nil {
					var sourceProdStock models.RTUOutletProductStock
					if err := tx.Where("product_id = ? AND outlet_id = ?", *item.ProductID, newSourceOutletID).First(&sourceProdStock).Error; err != nil {
						return fmt.Errorf("source outlet has no stock record for product %s", *item.ProductID)
					}
					if sourceProdStock.CurrentStock < item.Qty {
						return fmt.Errorf("insufficient product stock at source outlet")
					}
					sourceProdStock.CurrentStock -= item.Qty
					tx.Save(&sourceProdStock)

					totalCost, err := ConsumeFIFO(tx, newSourceOutletID, *item.ProductID, true, item.Qty, "DISTRIBUTION", existing.ID, now)
					if err == nil && item.Qty > 0 { item.UnitPrice = totalCost / item.Qty }
				}
			} else if existing.Type == models.DistributionTypeMaterial {
				if item.MaterialID != nil {
					var sourceMatStock models.RTUOutletMaterialStock
					if err := tx.Where("material_id = ? AND outlet_id = ?", *item.MaterialID, newSourceOutletID).First(&sourceMatStock).Error; err != nil {
						return fmt.Errorf("source outlet has no stock record for material %s", *item.MaterialID)
					}
					if sourceMatStock.CurrentStock < item.Qty {
						return fmt.Errorf("insufficient material stock at source outlet")
					}
					sourceMatStock.CurrentStock -= item.Qty
					tx.Save(&sourceMatStock)

					totalCost, err := ConsumeFIFO(tx, newSourceOutletID, *item.MaterialID, false, item.Qty, "DISTRIBUTION", existing.ID, now)
					if err == nil && item.Qty > 0 { item.UnitPrice = totalCost / item.Qty }
				}
			}

			if err := tx.Create(item).Error; err != nil {
				return fmt.Errorf("failed to save item: %w", err)
			}
		}

		history := models.RTUDistributionHistory{
			DistributionID: existing.ID,
			Action:         "UPDATED",
			Changes:        repositories.CompareDistributionChanges(&oldDist, existing),
			PerformedBy:    &updatedBy,
		}
		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		return nil
	})
}

func (s *rtuDistributionService) ShipDistribution(ctx context.Context, distID uuid.UUID, updatedBy uuid.UUID) error {
	return errors.New("ShipDistribution is obsolete as distributions are auto-shipped on creation")
}

func (s *rtuDistributionService) shipDistributionOld(ctx context.Context, distID uuid.UUID, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		distRepoTx := s.distRepo.WithTransaction(tx)

		dist, err := distRepoTx.FindByID(ctx, distID)
		if err != nil {
			return err
		}
		if dist == nil {
			return errors.New("distribution not found")
		}
		if dist.Status != models.DistributionStatusDraft {
			return fmt.Errorf("cannot ship with status: %s", dist.Status)
		}

		// Determine Source Outlet ID
		var sourceOutletID uuid.UUID
		if dist.SourceOutletID != nil {
			sourceOutletID = *dist.SourceOutletID
		} else {
			// Fallback to CK/Warehouse Outlet
			var ckOutlet models.Outlet
			if err := tx.Where("type = ? AND is_deleted = false", "WAREHOUSE").First(&ckOutlet).Error; err != nil {
				if err := tx.Where("is_deleted = false").Order("created_at ASC").First(&ckOutlet).Error; err != nil {
					return fmt.Errorf("no active warehouse/outlet found: %w", err)
				}
			}
			sourceOutletID = ckOutlet.ID
		}

		now := time.Now()

		if dist.Type == models.DistributionTypeProduct || dist.Type == "" {
			// ── PRODUCT SHIPMENT ──────────────────────────────────────────────
			for i := range dist.Items {
				item := &dist.Items[i]
				if item.ProductID == nil {
					continue
				}

				// Check and deduct source outlet product stock
				var sourceProdStock models.RTUOutletProductStock
				if err := tx.Where("product_id = ? AND outlet_id = ?", *item.ProductID, sourceOutletID).
					First(&sourceProdStock).Error; err != nil {
					return fmt.Errorf("source outlet has no stock record for product %s: %w", *item.ProductID, err)
				}
				if sourceProdStock.CurrentStock < item.Qty {
					var prod models.RTUProduct
					prodName := item.ProductID.String()
					if err := tx.Where("id = ?", *item.ProductID).First(&prod).Error; err == nil {
						prodName = prod.Name
					}
					return fmt.Errorf("insufficient product stock at source outlet for %s. Available: %.3f, Requested: %.3f",
						prodName, sourceProdStock.CurrentStock, item.Qty)
				}

				sourceProdStock.CurrentStock -= item.Qty
				if err := tx.Save(&sourceProdStock).Error; err != nil {
					return fmt.Errorf("failed to deduct source product stock: %w", err)
				}

				// Consume FIFO lots from source outlet
				totalCost, err := ConsumeFIFO(tx, sourceOutletID, *item.ProductID, true, item.Qty, "DISTRIBUTION", dist.ID, now)
				if err != nil {
					return fmt.Errorf("failed to consume FIFO lot for product %s: %w", *item.ProductID, err)
				}

				if item.Qty > 0 {
					item.UnitPrice = totalCost / item.Qty
				}
				if err := tx.Save(item).Error; err != nil {
					return fmt.Errorf("failed to save distribution item unit price: %w", err)
				}
			}
		} else if dist.Type == models.DistributionTypeMaterial {
			// ── MATERIAL SHIPMENT ─────────────────────────────────────────────
			for i := range dist.Items {
				item := &dist.Items[i]
				if item.MaterialID == nil {
					continue
				}

				// Check and deduct from source outlet material stock
				var sourceMatStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", *item.MaterialID, sourceOutletID).
					First(&sourceMatStock).Error; err != nil {
					return fmt.Errorf("source outlet has no stock record for material %s: %w", *item.MaterialID, err)
				}
				if sourceMatStock.CurrentStock < item.Qty {
					var mat models.RTUMaterial
					matName := item.MaterialID.String()
					if err := tx.Where("id = ?", *item.MaterialID).First(&mat).Error; err == nil {
						matName = mat.Name
					}
					return fmt.Errorf("insufficient material stock at source outlet for %s. Available: %.3f, Requested: %.3f",
						matName, sourceMatStock.CurrentStock, item.Qty)
				}

				sourceMatStock.CurrentStock -= item.Qty
				if err := tx.Save(&sourceMatStock).Error; err != nil {
					return fmt.Errorf("failed to deduct source material stock: %w", err)
				}

				// Consume FIFO lots from source outlet
				totalCost, err := ConsumeFIFO(tx, sourceOutletID, *item.MaterialID, false, item.Qty, "DISTRIBUTION", dist.ID, now)
				if err != nil {
					return fmt.Errorf("failed to consume FIFO lot for material %s: %w", *item.MaterialID, err)
				}

				if item.Qty > 0 {
					item.UnitPrice = totalCost / item.Qty
				}
				if err := tx.Save(item).Error; err != nil {
					return fmt.Errorf("failed to save distribution item unit price: %w", err)
				}
			}
		}

		// Update Status
		dist.Status = models.DistributionStatusShipped
		dist.ShipmentDate = &now
		dist.UpdatedBy = &updatedBy

		if err := distRepoTx.Update(ctx, dist); err != nil {
			return err
		}

		history := models.RTUDistributionHistory{
			DistributionID: dist.ID,
			Action:         "SHIPPED",
			Changes:        "Distribution shipped",
			PerformedBy:    &updatedBy,
		}
		return tx.Create(&history).Error
	})
}

func (s *rtuDistributionService) ReceiveDistribution(ctx context.Context, distID uuid.UUID, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		distRepoTx := s.distRepo.WithTransaction(tx)

		dist, err := distRepoTx.FindByID(ctx, distID)
		if err != nil {
			return err
		}
		if dist == nil {
			return errors.New("distribution not found")
		}
		if dist.Status != models.DistributionStatusShipped {
			return fmt.Errorf("cannot receive with status: %s", dist.Status)
		}

		now := time.Now()

		if dist.VendorID != nil {
			dist.Status = models.DistributionStatusReceived
			dist.ReceivedDate = &now
			dist.UpdatedBy = &updatedBy

			if err := distRepoTx.Update(ctx, dist); err != nil {
				return err
			}

			history := models.RTUDistributionHistory{
				DistributionID: dist.ID,
				Action:         "RECEIVED",
				Changes:        "Distribution received by vendor (Return)",
				PerformedBy:    &updatedBy,
			}
			return tx.Create(&history).Error
		}

		lotNumber := fmt.Sprintf("LOT-DIST-%s-%s", now.Format("20060102"), dist.DocNumber)

		if dist.OutletID == nil {
			return errors.New("destination outlet is required for distribution receive")
		}
		destOutletID := *dist.OutletID

		if dist.Type == models.DistributionTypeProduct || dist.Type == "" {
			// ── PRODUCT RECEIVE ───────────────────────────────────────────────
			for _, item := range dist.Items {
				if item.ProductID == nil {
					continue
				}
				// Upsert outlet product stock
				var outletProductStock models.RTUOutletProductStock
				if err := tx.Where("product_id = ? AND outlet_id = ?", *item.ProductID, destOutletID).
					First(&outletProductStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						outletProductStock = models.RTUOutletProductStock{
							ProductID:    *item.ProductID,
							OutletID:     destOutletID,
							CurrentStock: 0,
						}
						if err := tx.Create(&outletProductStock).Error; err != nil {
							return fmt.Errorf("failed to create outlet product stock: %w", err)
						}
					} else {
						return fmt.Errorf("failed to get outlet product stock: %w", err)
					}
				}
				outletProductStock.CurrentStock += item.Qty
				if err := tx.Save(&outletProductStock).Error; err != nil {
					return fmt.Errorf("failed to update outlet product stock: %w", err)
				}

				// Create FIFO lot at destination outlet
				newLot := models.RTUStockLot{
					ID:           uuid.New(),
					ProductID:    item.ProductID,
					OutletID:     destOutletID,
					LotNumber:    lotNumber,
					QtyInitial:   item.Qty,
					QtyRemaining: item.Qty,
					UnitPrice:    item.UnitPrice,
					RefType:      "DISTRIBUTION",
					RefID:        dist.ID,
					ReceivedDate: now,
				}
				if err := ReconcileNewLot(tx, &newLot); err != nil {
					return fmt.Errorf("failed to reconcile lot for product %s: %w", *item.ProductID, err)
				}
				if err := tx.Create(&newLot).Error; err != nil {
					return fmt.Errorf("failed to create stock lot for product %s: %w", *item.ProductID, err)
				}
			}
		} else if dist.Type == models.DistributionTypeMaterial {
			// ── MATERIAL RECEIVE ──────────────────────────────────────────────
			for _, item := range dist.Items {
				if item.MaterialID == nil {
					continue
				}
				// Upsert outlet material stock
				var outletMatStock models.RTUOutletMaterialStock
				if err := tx.Where("material_id = ? AND outlet_id = ?", *item.MaterialID, destOutletID).
					First(&outletMatStock).Error; err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						outletMatStock = models.RTUOutletMaterialStock{
							MaterialID:   *item.MaterialID,
							OutletID:     destOutletID,
							CurrentStock: 0,
						}
						if err := tx.Create(&outletMatStock).Error; err != nil {
							return fmt.Errorf("failed to create outlet material stock: %w", err)
						}
					} else {
						return fmt.Errorf("failed to get outlet material stock: %w", err)
					}
				}
				outletMatStock.CurrentStock += item.Qty
				if err := tx.Save(&outletMatStock).Error; err != nil {
					return fmt.Errorf("failed to update outlet material stock: %w", err)
				}

				// Create FIFO lot at destination outlet
				newLot := models.RTUStockLot{
					ID:           uuid.New(),
					MaterialID:   item.MaterialID,
					OutletID:     destOutletID,
					LotNumber:    lotNumber,
					QtyInitial:   item.Qty,
					QtyRemaining: item.Qty,
					UnitPrice:    item.UnitPrice,
					RefType:      "DISTRIBUTION",
					RefID:        dist.ID,
					ReceivedDate: now,
				}
				if err := ReconcileNewLot(tx, &newLot); err != nil {
					return fmt.Errorf("failed to reconcile lot for material %s: %w", *item.MaterialID, err)
				}
				if err := tx.Create(&newLot).Error; err != nil {
					return fmt.Errorf("failed to create stock lot for material %s: %w", *item.MaterialID, err)
				}
			}
		}

		dist.Status = models.DistributionStatusReceived
		dist.ReceivedDate = &now
		dist.UpdatedBy = &updatedBy

		if err := distRepoTx.Update(ctx, dist); err != nil {
			return err
		}

		history := models.RTUDistributionHistory{
			DistributionID: dist.ID,
			Action:         "RECEIVED",
			Changes:        "Distribution received",
			PerformedBy:    &updatedBy,
		}
		return tx.Create(&history).Error
	})
}

func (s *rtuDistributionService) CancelDistribution(ctx context.Context, distID uuid.UUID, updatedBy uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		distRepoTx := s.distRepo.WithTransaction(tx)
		dist, err := distRepoTx.FindByID(ctx, distID)
		if err != nil {
			return err
		}
		if dist == nil {
			return errors.New("distribution not found")
		}
		if dist.Status == models.DistributionStatusCancelled {
			return errors.New("distribution already cancelled")
		}

		now := time.Now()
		isProduct := dist.Type == models.DistributionTypeProduct || dist.Type == ""
		
		var sourceOutletID uuid.UUID
		if dist.SourceOutletID != nil {
			sourceOutletID = *dist.SourceOutletID
		} else {
			var ckOutlet models.Outlet
			if err := tx.Where("type = ? AND is_deleted = false", "WAREHOUSE").First(&ckOutlet).Error; err != nil {
				if err := tx.Where("is_deleted = false").Order("created_at ASC").First(&ckOutlet).Error; err != nil {
					return fmt.Errorf("no active warehouse/outlet found: %w", err)
				}
			}
			sourceOutletID = ckOutlet.ID
		}

		// Reversal process if SHIPPED or RECEIVED
		if dist.Status == models.DistributionStatusShipped || dist.Status == models.DistributionStatusReceived {
			var destOutletID uuid.UUID
			if dist.Status == models.DistributionStatusReceived && dist.VendorID == nil {
				if dist.OutletID == nil {
					return errors.New("destination outlet is required for distribution reversal")
				}
				destOutletID = *dist.OutletID
			}

			for _, item := range dist.Items {
				var itemID uuid.UUID
				if isProduct {
					if item.ProductID == nil { continue }
					itemID = *item.ProductID
				} else {
					if item.MaterialID == nil { continue }
					itemID = *item.MaterialID
				}

				// 1. If RECEIVED and not vendor, reverse stock at Destination Outlet
				if dist.Status == models.DistributionStatusReceived && dist.VendorID == nil {
					// Reduce current stock at destination outlet
					if isProduct {
						var destStock models.RTUOutletProductStock
						if err := tx.Where("product_id = ? AND outlet_id = ?", itemID, destOutletID).First(&destStock).Error; err == nil {
							destStock.CurrentStock -= item.Qty
							if err := tx.Save(&destStock).Error; err != nil {
								return fmt.Errorf("failed to deduct destination product stock: %w", err)
							}
						}
					} else {
						var destStock models.RTUOutletMaterialStock
						if err := tx.Where("material_id = ? AND outlet_id = ?", itemID, destOutletID).First(&destStock).Error; err == nil {
							destStock.CurrentStock -= item.Qty
							if err := tx.Save(&destStock).Error; err != nil {
								return fmt.Errorf("failed to deduct destination material stock: %w", err)
							}
						}
					}

					// Find and delete the lot created during receive at destination
					var destLot models.RTUStockLot
					query := tx.Where("ref_id = ? AND ref_type = ? AND outlet_id = ?", dist.ID, "DISTRIBUTION", destOutletID)
					if isProduct {
						query = query.Where("product_id = ?", itemID)
					} else {
						query = query.Where("material_id = ?", itemID)
					}
					if err := query.First(&destLot).Error; err == nil {
						if err := tx.Unscoped().Delete(&destLot).Error; err != nil {
							return fmt.Errorf("failed to delete destination stock lot: %w", err)
						}
					}
				}

				// 2. Reverse stock at Source Outlet (Return the consumed stock)
				// Increase current stock at source outlet
				if isProduct {
					var sourceStock models.RTUOutletProductStock
					if err := tx.Where("product_id = ? AND outlet_id = ?", itemID, sourceOutletID).First(&sourceStock).Error; err == nil {
						sourceStock.CurrentStock += item.Qty
						if err := tx.Save(&sourceStock).Error; err != nil {
							return fmt.Errorf("failed to increase source product stock: %w", err)
						}
					}
				} else {
					var sourceStock models.RTUOutletMaterialStock
					if err := tx.Where("material_id = ? AND outlet_id = ?", itemID, sourceOutletID).First(&sourceStock).Error; err == nil {
						sourceStock.CurrentStock += item.Qty
						if err := tx.Save(&sourceStock).Error; err != nil {
							return fmt.Errorf("failed to increase source material stock: %w", err)
						}
					}
				}

				// Create a reversal lot at source outlet to add the stock back
				lotNumber := fmt.Sprintf("LOT-REV-DIST-%s-%s-%s", now.Format("20060102"), dist.DocNumber, uuid.New().String()[:6])
				newLot := models.RTUStockLot{
					ID:           uuid.New(),
					OutletID:     sourceOutletID,
					LotNumber:    lotNumber,
					QtyInitial:   item.Qty,
					QtyRemaining: item.Qty,
					UnitPrice:    item.UnitPrice,
					RefType:      "DISTRIBUTION_REVERSAL",
					RefID:        dist.ID,
					ReceivedDate: now,
				}
				if isProduct {
					newLot.ProductID = &itemID
				} else {
					newLot.MaterialID = &itemID
				}

				if err := ReconcileNewLot(tx, &newLot); err != nil {
					return fmt.Errorf("failed to reconcile reversal lot: %w", err)
				}
				if err := tx.Create(&newLot).Error; err != nil {
					return fmt.Errorf("failed to create reversal stock lot: %w", err)
				}
			}
		}

		dist.Status = models.DistributionStatusCancelled
		dist.UpdatedBy = &updatedBy

		if err := distRepoTx.Update(ctx, dist); err != nil {
			return err
		}

		history := models.RTUDistributionHistory{
			DistributionID: dist.ID,
			Action:         "CANCELLED",
			Changes:        "Distribution cancelled",
			PerformedBy:    &updatedBy,
		}
		return tx.Create(&history).Error
	})
}
