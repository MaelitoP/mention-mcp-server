package client

import (
	"context"
	"mention-mcp-server/models"
	"net/http"
)

type MentionClient interface {
	CreateBasicAlert(ctx context.Context, req models.CreateAlertRequest) (*models.CreateAlertResponse, error)

	GetAppData(ctx context.Context) (*models.AppData, error)
}

type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}
