package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"mention-mcp-server/models"
	"mention-mcp-server/utils"
)

type httpClient struct {
	baseURL     string
	apiVersion  string
	accessToken string
	userAgent   string
	client      HTTPClient
	logger      utils.Logger
}

func newHTTPClient(baseURL, apiVersion, accessToken, userAgent string, timeout time.Duration, logger utils.Logger) *httpClient {
	return &httpClient{
		baseURL:     baseURL,
		apiVersion:  apiVersion,
		accessToken: accessToken,
		userAgent:   userAgent,
		client: &http.Client{
			Timeout: timeout,
		},
		logger: logger,
	}
}

func (c *httpClient) request(ctx context.Context, method, path string, body, out interface{}) error {
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

	c.logger.Debug("=== HTTP REQUEST ===")
	c.logger.Debug("Method: %s", method)
	c.logger.Debug("URL: %s", url)
	c.logger.Debug("Headers:")
	c.logger.Debug("  Content-Type: application/json")
	c.logger.Debug("  Accept-Version: %s", c.apiVersion)
	c.logger.Debug("  User-Agent: %s", c.userAgent)
	c.logger.Debug("  Authorization: Bearer [REDACTED]")
	if bodyData != nil {
		c.logger.Debug("Request Body: %s", string(bodyData))
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		c.logger.Error("ERROR creating request: %v", err)
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept-Version", c.apiVersion)
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Authorization", "Bearer "+c.accessToken)

	resp, err := c.client.Do(req)
	if err != nil {
		c.logger.Error("ERROR executing request: %v", err)
		return fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		c.logger.Error("ERROR reading response body: %v", err)
		return fmt.Errorf("read response body: %w", err)
	}

	c.logger.Debug("=== HTTP RESPONSE ===")
	c.logger.Debug("Status: %d %s", resp.StatusCode, resp.Status)
	c.logger.Debug("Response Headers:")
	for name, values := range resp.Header {
		for _, value := range values {
			c.logger.Debug("  %s: %s", name, value)
		}
	}
	c.logger.Debug("Response Body: %s", string(respData))

	if resp.StatusCode >= 400 {
		var apiErr models.MentionAPIError
		if err := json.Unmarshal(respData, &apiErr); err != nil {
			c.logger.Error("ERROR unmarshaling API error: %v", err)

			apiErr = models.MentionAPIError{
				StatusCode: resp.StatusCode,
				Form: models.FormErrorDetail{
					Errors: []string{string(respData)},
				},
			}
		} else {
			apiErr.StatusCode = resp.StatusCode
		}
		c.logger.Error("API Error: %+v", apiErr)
		return apiErr
	}

	if out != nil && len(respData) > 0 {
		if err := json.Unmarshal(respData, out); err != nil {
			c.logger.Error("ERROR unmarshaling response: %v", err)
			return fmt.Errorf("unmarshal response body: %w", err)
		}
	}

	c.logger.Debug("=== REQUEST COMPLETED ===")
	return nil
}
