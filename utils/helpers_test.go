package utils

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateSourceType(t *testing.T) {
	tests := []struct {
		name     string
		source   string
		expected bool
	}{
		{"valid web source", "web", true},
		{"valid news source", "news", true},
		{"valid twitter source", "twitter", true},
		{"valid facebook source", "facebook", true},
		{"valid instagram source", "instagram", true},
		{"valid linkedin source", "linkedin", true},
		{"valid youtube source", "youtube", true},
		{"valid reddit source", "reddit", true},
		{"valid blogs source", "blogs", true},
		{"valid forums source", "forums", true},
		{"valid pinterest source", "pinterest", true},
		{"valid tiktok source", "tiktok", true},
		{"invalid source", "invalid_source", false},
		{"empty source", "", false},
		{"uppercase source", "WEB", false},
		{"mixed case source", "Web", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateSourceType(tt.source)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestFormatErrorResponse(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected string
	}{
		{
			name:     "nil error",
			err:      nil,
			expected: "Unknown error occurred",
		},
		{
			name:     "simple error",
			err:      errors.New("test error"),
			expected: "test error",
		},
		{
			name:     "empty error message",
			err:      errors.New(""),
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FormatErrorResponse(tt.err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestTruncateString(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		maxLen   int
		expected string
	}{
		{
			name:     "string shorter than max length",
			input:    "hello",
			maxLen:   10,
			expected: "hello",
		},
		{
			name:     "string equal to max length",
			input:    "hello",
			maxLen:   5,
			expected: "hello",
		},
		{
			name:     "string longer than max length",
			input:    "hello world",
			maxLen:   8,
			expected: "hello...",
		},
		{
			name:     "max length very small",
			input:    "hello",
			maxLen:   3,
			expected: "hel",
		},
		{
			name:     "max length 1",
			input:    "hello",
			maxLen:   1,
			expected: "h",
		},
		{
			name:     "empty string",
			input:    "",
			maxLen:   5,
			expected: "",
		},
		{
			name:     "max length 0",
			input:    "hello",
			maxLen:   0,
			expected: "",
		},
		{
			name:     "unicode characters",
			input:    "héllo wörld",
			maxLen:   8,
			expected: "héllo...",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := TruncateString(tt.input, tt.maxLen)
			assert.Equal(t, tt.expected, result)
		})
	}
}