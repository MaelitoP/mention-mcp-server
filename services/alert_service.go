package services

import (
	"context"
	"fmt"

	"mention-mcp-server/client"
	"mention-mcp-server/models"
	"mention-mcp-server/utils"
)

type AlertService struct {
	client client.MentionClient
	logger utils.Logger
}

func NewAlertService(client client.MentionClient, logger utils.Logger) *AlertService {
	return &AlertService{
		client: client,
		logger: logger,
	}
}

func (s *AlertService) CreateBasicAlert(ctx context.Context, req AlertCreateRequest) (*models.CreateAlertResponse, error) {
	if err := s.validateCreateAlertRequest(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	apiReq := models.CreateAlertRequest{
		Name: req.Name,
		Query: models.Query{
			Type:             "basic",
			IncludedKeywords: req.IncludedKeywords,
			RequiredKeywords: req.RequiredKeywords,
			ExcludedKeywords: req.ExcludedKeywords,
		},
		Languages: req.Languages,
		Countries: req.Countries,
		Sources:   req.Sources,
		GroupID:   req.GroupID,
	}

	s.logger.Info("Creating alert: %s", req.Name)

	response, err := s.client.CreateBasicAlert(ctx, apiReq)
	if err != nil {
		s.logger.Error("Failed to create alert: %v", err)
		return nil, err
	}

	s.logger.Info("Successfully created alert with ID: %s", response.Alert.ID)
	return response, nil
}

func (s *AlertService) GetAppData(ctx context.Context) (*models.AppData, error) {
	s.logger.Info("Fetching app data")

	data, err := s.client.GetAppData(ctx)
	if err != nil {
		s.logger.Error("Failed to get app data: %v", err)
		return nil, err
	}

	s.logger.Info("Successfully retrieved app data")
	return data, nil
}

func (s *AlertService) validateCreateAlertRequest(req AlertCreateRequest) error {
	if req.Name == "" {
		return fmt.Errorf("alert name is required")
	}

	if len(req.IncludedKeywords) == 0 {
		return fmt.Errorf("at least one included keyword is required")
	}

	if len(req.Languages) == 0 {
		return fmt.Errorf("at least one language is required")
	}

	if len(req.Sources) == 0 {
		return fmt.Errorf("at least one source is required")
	}

	// Validate sources
	for _, source := range req.Sources {
		if !utils.ValidateSourceType(source) {
			return fmt.Errorf("invalid source type: %s", source)
		}
	}

	return nil
}
