package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMentionAPIError_Error(t *testing.T) {
	tests := []struct {
		name     string
		err      MentionAPIError
		expected string
	}{
		{
			name: "simple error with form errors",
			err: MentionAPIError{
				StatusCode: 400,
				Form: FormErrorDetail{
					Errors: []string{"Form validation failed"},
				},
			},
			expected: "API request failed (HTTP 400). Form errors: Form validation failed",
		},
		{
			name: "error with field errors",
			err: MentionAPIError{
				StatusCode: 400,
				Form: FormErrorDetail{
					Children: map[string]FormErrorDetail{
						"languages": {
							Errors: []string{"Please select at least one language."},
						},
						"sources": {
							Errors: []string{"Please select at least one source"},
						},
					},
				},
			},
			expected: "API request failed (HTTP 400). Field errors: languages: Please select at least one language.; sources: Please select at least one source",
		},
		{
			name: "error with nested field errors",
			err: MentionAPIError{
				StatusCode: 400,
				Form: FormErrorDetail{
					Children: map[string]FormErrorDetail{
						"query": {
							Children: map[string]FormErrorDetail{
								"included_keywords": {
									Errors: []string{"At least one keyword is required"},
								},
							},
						},
					},
				},
			},
			expected: "API request failed (HTTP 400). Field errors: query.included_keywords: At least one keyword is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.err.Error()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMentionAPIError_GetFieldErrors(t *testing.T) {
	err := MentionAPIError{
		Form: FormErrorDetail{
			Children: map[string]FormErrorDetail{
				"languages": {
					Errors: []string{"Please select at least one language."},
				},
				"query": {
					Children: map[string]FormErrorDetail{
						"included_keywords": {
							Errors: []string{"At least one keyword is required"},
						},
					},
				},
			},
		},
	}

	tests := []struct {
		name      string
		fieldPath string
		expected  []string
	}{
		{
			name:      "direct field error",
			fieldPath: "languages",
			expected:  []string{"Please select at least one language."},
		},
		{
			name:      "nested field error",
			fieldPath: "query.included_keywords",
			expected:  []string{"At least one keyword is required"},
		},
		{
			name:      "non-existent field",
			fieldPath: "nonexistent",
			expected:  nil,
		},
		{
			name:      "partial path",
			fieldPath: "query.nonexistent",
			expected:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := err.GetFieldErrors(tt.fieldPath)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMentionAPIError_HasFieldError(t *testing.T) {
	err := MentionAPIError{
		Form: FormErrorDetail{
			Children: map[string]FormErrorDetail{
				"languages": {
					Errors: []string{"Please select at least one language."},
				},
				"sources": {
					Errors: []string{},
				},
			},
		},
	}

	tests := []struct {
		name      string
		fieldPath string
		expected  bool
	}{
		{
			name:      "field with errors",
			fieldPath: "languages",
			expected:  true,
		},
		{
			name:      "field with empty errors",
			fieldPath: "sources",
			expected:  false,
		},
		{
			name:      "non-existent field",
			fieldPath: "nonexistent",
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := err.HasFieldError(tt.fieldPath)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMentionAPIError_StatusChecks(t *testing.T) {
	tests := []struct {
		name         string
		statusCode   int
		isClient     bool
		isServer     bool
		isValidation bool
		isAuth       bool
		isRateLimit  bool
		isPayment    bool
	}{
		{
			name:         "400 Bad Request",
			statusCode:   400,
			isClient:     true,
			isValidation: true,
		},
		{
			name:       "401 Unauthorized",
			statusCode: 401,
			isClient:   true,
			isAuth:     true,
		},
		{
			name:       "402 Payment Required",
			statusCode: 402,
			isClient:   true,
			isPayment:  true,
		},
		{
			name:       "403 Forbidden",
			statusCode: 403,
			isClient:   true,
			isAuth:     true,
		},
		{
			name:       "404 Not Found",
			statusCode: 404,
			isClient:   true,
		},
		{
			name:        "429 Too Many Requests",
			statusCode:  429,
			isClient:    true,
			isRateLimit: true,
		},
		{
			name:       "500 Internal Server Error",
			statusCode: 500,
			isServer:   true,
		},
		{
			name:       "502 Bad Gateway",
			statusCode: 502,
			isServer:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := MentionAPIError{StatusCode: tt.statusCode}

			assert.Equal(t, tt.isClient, err.IsClientError(), "IsClientError")
			assert.Equal(t, tt.isServer, err.IsServerError(), "IsServerError")
			assert.Equal(t, tt.isValidation, err.IsValidationError(), "IsValidationError")
			assert.Equal(t, tt.isAuth, err.IsAuthError(), "IsAuthError")
			assert.Equal(t, tt.isRateLimit, err.IsRateLimited(), "IsRateLimited")
			assert.Equal(t, tt.isPayment, err.IsPaymentRequired(), "IsPaymentRequired")
		})
	}
}
