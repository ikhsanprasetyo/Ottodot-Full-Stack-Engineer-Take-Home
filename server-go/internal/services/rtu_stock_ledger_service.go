package services

import (
	"context"

	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/repositories"
)

type RTUStockLedgerService interface {
	GetAll(ctx context.Context, filter map[string]interface{}) ([]models.RTUStockLedger, error)
}

type rtuStockLedgerService struct {
	repo repositories.RTUStockLedgerRepository
}

func NewRTUStockLedgerService(repo repositories.RTUStockLedgerRepository) RTUStockLedgerService {
	return &rtuStockLedgerService{repo: repo}
}

func (s *rtuStockLedgerService) GetAll(ctx context.Context, filter map[string]interface{}) ([]models.RTUStockLedger, error) {
	return s.repo.GetAll(ctx, filter)
}
