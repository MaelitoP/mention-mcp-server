package handlers

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"mention-mcp-server/models"
)

func TestFormatError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected string
	}{
		{
			name:     "regular error",
			err:      errors.New("simple error"),
			expected: "simple error",
		},
		{
			name:     "nil error",
			err:      nil,
			expected: "Unknown error occurred",
		},
		{
			name: "mention API validation error",
			err: models.MentionAPIError{
				StatusCode: 400,
				Form: models.FormErrorDetail{
					Errors: []string{"Form validation failed"},
					Children: map[string]models.FormErrorDetail{
						"languages": {
							Errors: []string{"Please select at least one language."},
						},
						"sources": {
							Errors: []string{"Please select at least one source"},
						},
					},
				},
			},
			expected: "Form validation errors: Form validation failed. Field errors: languages: Please select at least one language.; sources: Please select at least one source",
		},
		{
			name: "mention API error with field errors only",
			err: models.MentionAPIError{
				StatusCode: 400,
				Form: models.FormErrorDetail{
					Children: map[string]models.FormErrorDetail{
						"name": {
							Errors: []string{"Name is required"},
						},
					},
				},
			},
			expected: "Field errors: name: Name is required",
		},
		{
			name: "mention API server error",
			err: models.MentionAPIError{
				StatusCode: 500,
				Form:       models.FormErrorDetail{},
			},
			expected: "API request failed (HTTP 500)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatError(tt.err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestFormatMentionAPIError(t *testing.T) {
	tests := []struct {
		name     string
		err      models.MentionAPIError
		expected string
	}{
		{
			name: "validation error with form and field errors",
			err: models.MentionAPIError{
				StatusCode: 400,
				Form: models.FormErrorDetail{
					Errors: []string{"General form error"},
					Children: map[string]models.FormErrorDetail{
						"languages": {
							Errors: []string{"Language required"},
						},
					},
				},
			},
			expected: "Form validation errors: General form error. Field errors: languages: Language required",
		},
		{
			name: "validation error with only field errors",
			err: models.MentionAPIError{
				StatusCode: 400,
				Form: models.FormErrorDetail{
					Children: map[string]models.FormErrorDetail{
						"sources": {
							Errors: []string{"Source required"},
						},
					},
				},
			},
			expected: "Field errors: sources: Source required",
		},
		{
			name: "non-validation error",
			err: models.MentionAPIError{
				StatusCode: 401,
				Form:       models.FormErrorDetail{},
			},
			expected: "API request failed (HTTP 401)",
		},
		{
			name: "error with no form data",
			err: models.MentionAPIError{
				StatusCode: 400,
				Form:       models.FormErrorDetail{},
			},
			expected: "API request failed (HTTP 400)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatMentionAPIError(tt.err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCollectFieldErrors(t *testing.T) {
	tests := []struct {
		name     string
		children map[string]models.FormErrorDetail
		expected []string
	}{
		{
			name: "simple field errors",
			children: map[string]models.FormErrorDetail{
				"languages": {
					Errors: []string{"Language required"},
				},
				"sources": {
					Errors: []string{"Source required"},
				},
			},
			expected: []string{"languages: Language required", "sources: Source required"},
		},
		{
			name: "nested field errors",
			children: map[string]models.FormErrorDetail{
				"query": {
					Children: map[string]models.FormErrorDetail{
						"included_keywords": {
							Errors: []string{"Keywords required"},
						},
					},
				},
			},
			expected: []string{"query.included_keywords: Keywords required"},
		},
		{
			name: "mixed field and nested errors",
			children: map[string]models.FormErrorDetail{
				"name": {
					Errors: []string{"Name required"},
				},
				"query": {
					Children: map[string]models.FormErrorDetail{
						"type": {
							Errors: []string{"Type required"},
						},
					},
				},
			},
			expected: []string{"name: Name required", "query.type: Type required"},
		},
		{
			name:     "empty children",
			children: map[string]models.FormErrorDetail{},
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := collectFieldErrors(tt.children)
			
			// Sort both slices to ensure consistent comparison
			assert.ElementsMatch(t, tt.expected, result)
		})
	}
}

func TestValidateString(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		maxLength int
		expected  string
	}{
		{
			name:      "string within limit",
			input:     "hello",
			maxLength: 10,
			expected:  "hello",
		},
		{
			name:      "string exceeds limit",
			input:     "hello world this is a long string",
			maxLength: 10,
			expected:  "hello w...",
		},
		{
			name:      "empty string",
			input:     "",
			maxLength: 10,
			expected:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateString(tt.input, tt.maxLength)
			assert.Equal(t, tt.expected, result)
		})
	}
}