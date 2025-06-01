package client

import (
	"fmt"
	"time"
)

type CreateBasicAlertResponse struct {
	Alert BasicAlert `json:"alert"`
}

type BasicAlert struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Query     BasicAlertQuery `json:"query"`
	Languages []string        `json:"languages"`
	Countries []string        `json:"countries"`
	Sources   []string        `json:"sources"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type CreateBasicAlertRequest struct {
	Name      string          `json:"name"`
	Query     BasicAlertQuery `json:"query"`
	Languages []string        `json:"languages,omitempty"`
	Countries []string        `json:"countries,omitempty"`
	Sources   []string        `json:"sources,omitempty"`
	GroupID   string          `json:"group_id,omitempty"`
}

type BasicAlertQuery struct {
	Type             string   `json:"type"`
	IncludedKeywords []string `json:"included_keywords"`
	RequiredKeywords []string `json:"required_keywords,omitempty"`
	ExcludedKeywords []string `json:"excluded_keywords,omitempty"`
}

type APIError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func (e APIError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("API error %d: %s - %s", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("API error %d: %s", e.Code, e.Message)
}

type AppData struct {
	AlertLanguages map[string]Language `json:"alert_languages"`
	AlertCountries map[string]string   `json:"alert_countries"`
	AlertSources   map[string]Source   `json:"alert_sources"`
}

type Language struct {
	Name  string `json:"name"`
	Order int    `json:"order"`
}

type Source struct {
	Name  string            `json:"name"`
	Icons map[string]string `json:"icons"`
	Order int               `json:"order"`
}
