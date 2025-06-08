package models

import (
	"fmt"
	"strings"
)

type MentionAPIError struct {
	StatusCode int             `json:"-"`
	Form       FormErrorDetail `json:"form"`
}

type FormErrorDetail struct {
	Errors   []string                   `json:"errors,omitempty"`
	Children map[string]FormErrorDetail `json:"children,omitempty"`
}

func (e MentionAPIError) Error() string {
	var errorMessages []string

	statusText := fmt.Sprintf("API request failed (HTTP %d)", e.StatusCode)
	errorMessages = append(errorMessages, statusText)

	if len(e.Form.Errors) > 0 {
		errorMessages = append(errorMessages, fmt.Sprintf("Form errors: %s", strings.Join(e.Form.Errors, ", ")))
	}

	fieldErrors := e.collectFieldErrors("", e.Form.Children)
	if len(fieldErrors) > 0 {
		errorMessages = append(errorMessages, fmt.Sprintf("Field errors: %s", strings.Join(fieldErrors, "; ")))
	}

	return strings.Join(errorMessages, ". ")
}

func (e MentionAPIError) collectFieldErrors(prefix string, children map[string]FormErrorDetail) []string {
	var errors []string

	for fieldName, detail := range children {
		currentPath := fieldName
		if prefix != "" {
			currentPath = fmt.Sprintf("%s.%s", prefix, fieldName)
		}

		for _, err := range detail.Errors {
			errors = append(errors, fmt.Sprintf("%s: %s", currentPath, err))
		}

		if len(detail.Children) > 0 {
			childErrors := e.collectFieldErrors(currentPath, detail.Children)
			errors = append(errors, childErrors...)
		}
	}

	return errors
}

func (e MentionAPIError) GetFieldErrors(fieldPath string) []string {
	parts := strings.Split(fieldPath, ".")
	current := &e.Form

	for _, part := range parts {
		if current.Children == nil {
			return nil
		}
		if child, exists := current.Children[part]; exists {
			current = &child
		} else {
			return nil
		}
	}

	return current.Errors
}

func (e MentionAPIError) HasFieldError(fieldPath string) bool {
	return len(e.GetFieldErrors(fieldPath)) > 0
}

func (e MentionAPIError) IsClientError() bool {
	return e.StatusCode >= 400 && e.StatusCode < 500
}

func (e MentionAPIError) IsServerError() bool {
	return e.StatusCode >= 500
}

func (e MentionAPIError) IsValidationError() bool {
	return e.StatusCode == 400
}

func (e MentionAPIError) IsAuthError() bool {
	return e.StatusCode == 401 || e.StatusCode == 403
}

func (e MentionAPIError) IsRateLimited() bool {
	return e.StatusCode == 429
}

func (e MentionAPIError) IsPaymentRequired() bool {
	return e.StatusCode == 402
}
