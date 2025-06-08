package services

type AlertCreateRequest struct {
	Name             string   `json:"name"`
	IncludedKeywords []string `json:"included_keywords"`
	RequiredKeywords []string `json:"required_keywords,omitempty"`
	ExcludedKeywords []string `json:"excluded_keywords,omitempty"`
	Languages        []string `json:"languages"`
	Countries        []string `json:"countries,omitempty"`
	Sources          []string `json:"sources"`
	GroupID          string   `json:"group_id,omitempty"`
}
