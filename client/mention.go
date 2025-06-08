package client

import (
	"context"
	"fmt"
	"time"

	"mention-mcp-server/config"
	"mention-mcp-server/models"
	"mention-mcp-server/utils"
)

type Client struct {
	accountID  string
	groupID    string
	httpClient *httpClient
}

func NewClient(cfg *config.Config, logger utils.Logger) *Client {
	userAgent := fmt.Sprintf("%s/%s", cfg.Server.Name, cfg.Server.Version)
	timeout := time.Duration(cfg.Server.Timeout) * time.Second

	return &Client{
		accountID: cfg.MentionAPI.AccountID,
		groupID:   cfg.MentionAPI.GroupID,
		httpClient: newHTTPClient(
			cfg.MentionAPI.BaseURL,
			cfg.MentionAPI.APIVersion,
			cfg.MentionAPI.AccessToken,
			userAgent,
			timeout,
			logger,
		),
	}
}

// CreateBasicAlert creates a new basic monitoring alert
func (c *Client) CreateBasicAlert(ctx context.Context, req models.CreateAlertRequest) (*models.CreateAlertResponse, error) {
	if c.accountID == "" {
		return nil, fmt.Errorf("account ID is required")
	}

	if req.GroupID == "" && c.groupID != "" {
		req.GroupID = c.groupID
	}

	if req.GroupID == "" {
		return nil, fmt.Errorf("group ID is required")
	}

	var response models.CreateAlertResponse
	path := fmt.Sprintf("/accounts/%s/alerts", c.accountID)

	if err := c.httpClient.request(ctx, "POST", path, req, &response); err != nil {
		return nil, fmt.Errorf("create basic alert: %w", err)
	}

	return &response, nil
}

// GetAppData retrieves application configuration data
func (c *Client) GetAppData(ctx context.Context) (*models.AppData, error) {
	var response models.AppData
	path := "/app/data"

	if err := c.httpClient.request(ctx, "GET", path, nil, &response); err != nil {
		return nil, fmt.Errorf("get app data: %w", err)
	}

	return &response, nil
}
