package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"mention-mcp-server/config"
)

type Client struct {
	baseURL     string
	apiVersion  string
	accountID   string
	groupID     string
	accessToken string
	userAgent   string
	httpClient  *http.Client
	logger      *log.Logger
}

func NewClient(cfg *config.Config) *Client {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	logDir := fmt.Sprintf("%s/.config/mention-mcp/logs", homeDir)
	os.MkdirAll(logDir, 0755)

	logFileName := fmt.Sprintf("%s/http-debug-%s.log", logDir, time.Now().Format("2006-01-02"))
	logFile, err := os.OpenFile(logFileName, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	var logger *log.Logger
	if err != nil {
		logger = log.New(os.Stderr, "HTTP: ", log.Ldate|log.Ltime|log.Lshortfile)
	} else {
		logger = log.New(logFile, "HTTP: ", log.Ldate|log.Ltime|log.Lshortfile)
	}

	return &Client{
		baseURL:     cfg.MentionAPI.BaseURL,
		apiVersion:  cfg.MentionAPI.APIVersion,
		accountID:   cfg.MentionAPI.AccountID,
		groupID:     cfg.MentionAPI.GroupID,
		accessToken: cfg.MentionAPI.AccessToken,
		userAgent:   fmt.Sprintf("%s/%s", cfg.Server.Name, cfg.Server.Version),
		httpClient: &http.Client{
			Timeout: time.Duration(cfg.Server.Timeout) * time.Second,
		},
		logger: logger,
	}
}

// request performs an HTTP request and decodes the response into 'out'
func (c *Client) request(ctx context.Context, method, path string, body, out interface{}) error {
	var reqBody io.Reader
	var bodyData []byte
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal request body: %w", err)
		}
		bodyData = data
		reqBody = bytes.NewReader(data)
	}

	url := fmt.Sprintf("%s%s", c.baseURL, path)

	// Log request details
	c.logger.Printf("=== HTTP REQUEST ===")
	c.logger.Printf("Method: %s", method)
	c.logger.Printf("URL: %s", url)
	c.logger.Printf("Headers:")
	c.logger.Printf("  Content-Type: application/json")
	c.logger.Printf("  Accept-Version: %s", c.apiVersion)
	c.logger.Printf("  User-Agent: %s", c.userAgent)
	c.logger.Printf("  Authorization: Bearer [REDACTED]")
	if bodyData != nil {
		c.logger.Printf("Request Body: %s", string(bodyData))
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		c.logger.Printf("ERROR creating request: %v", err)
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept-Version", c.apiVersion)
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Authorization", "Bearer "+c.accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Printf("ERROR executing request: %v", err)
		return fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		c.logger.Printf("ERROR reading response body: %v", err)
		return fmt.Errorf("read response body: %w", err)
	}

	c.logger.Printf("=== HTTP RESPONSE ===")
	c.logger.Printf("Status: %d %s", resp.StatusCode, resp.Status)
	c.logger.Printf("Response Headers:")
	for name, values := range resp.Header {
		for _, value := range values {
			c.logger.Printf("  %s: %s", name, value)
		}
	}
	c.logger.Printf("Response Body: %s", string(respData))

	if resp.StatusCode >= 400 {
		var apiErr APIError
		if err := json.Unmarshal(respData, &apiErr); err != nil {
			c.logger.Printf("ERROR unmarshaling API error: %v", err)
			return fmt.Errorf("status %d: %s", resp.StatusCode, string(respData))
		}
		apiErr.Code = resp.StatusCode
		c.logger.Printf("API Error: %+v", apiErr)
		return apiErr
	}

	if out != nil && len(respData) > 0 {
		if err := json.Unmarshal(respData, out); err != nil {
			c.logger.Printf("ERROR unmarshaling response: %v", err)
			return fmt.Errorf("unmarshal response body: %w", err)
		}
	}

	c.logger.Printf("=== REQUEST COMPLETED ===")
	return nil
}

func (c *Client) CreateBasicAlert(ctx context.Context, req CreateBasicAlertRequest) (*CreateBasicAlertResponse, error) {
	if c.accountID == "" {
		return nil, fmt.Errorf("account ID is required")
	}

	req.GroupID = c.groupID
	if req.GroupID == "" {
		return nil, fmt.Errorf("group ID is required")
	}

	var response CreateBasicAlertResponse
	path := fmt.Sprintf("/accounts/%s/alerts", c.accountID)

	if err := c.request(ctx, http.MethodPost, path, req, &response); err != nil {
		return nil, fmt.Errorf("create basic alert: %w", err)
	}

	return &response, nil
}

func (c *Client) GetAppData(ctx context.Context) (*AppData, error) {
	var response AppData
	path := "/app/data"

	if err := c.request(ctx, http.MethodGet, path, nil, &response); err != nil {
		return nil, fmt.Errorf("get app data: %w", err)
	}

	return &response, nil
}
