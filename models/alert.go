package models

import "time"

type Alert struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Query     Query     `json:"query"`
	Languages []string  `json:"languages"`
	Countries []string  `json:"countries"`
	Sources   []string  `json:"sources"`
	GroupID   string    `json:"group_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Query struct {
	Type             string   `json:"type"`
	IncludedKeywords []string `json:"included_keywords"`
	RequiredKeywords []string `json:"required_keywords,omitempty"`
	ExcludedKeywords []string `json:"excluded_keywords,omitempty"`
}

type CreateAlertRequest struct {
	Name      string   `json:"name"`
	Query     Query    `json:"query"`
	Languages []string `json:"languages,omitempty"`
	Countries []string `json:"countries,omitempty"`
	Sources   []string `json:"sources,omitempty"`
	GroupID   string   `json:"group_id,omitempty"`
}

type CreateAlertResponse struct {
	Alert Alert `json:"alert"`
}
