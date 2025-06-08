package handlers

import (
	"errors"
	"strings"

	"mention-mcp-server/client"
	"mention-mcp-server/models"
	"mention-mcp-server/services"
	"mention-mcp-server/utils"
)

type Config struct {
	Client       *client.Client
	Logger       utils.Logger
	AlertService *services.AlertService
}

func formatError(err error) string {
	var mentionErr models.MentionAPIError
	if errors.As(err, &mentionErr) {
		return formatMentionAPIError(mentionErr)
	}
	return utils.FormatErrorResponse(err)
}

func formatMentionAPIError(err models.MentionAPIError) string {
	var parts []string

	if err.IsValidationError() {
		if len(err.Form.Errors) > 0 {
			parts = append(parts, "Form validation errors: "+strings.Join(err.Form.Errors, ", "))
		}

		fieldErrors := collectFieldErrors(err.Form.Children)
		if len(fieldErrors) > 0 {
			parts = append(parts, "Field errors: "+strings.Join(fieldErrors, "; "))
		}

		if len(parts) == 0 {
			parts = append(parts, err.Error())
		}
	} else {
		parts = append(parts, err.Error())
	}

	return strings.Join(parts, ". ")
}

func collectFieldErrors(children map[string]models.FormErrorDetail) []string {
	var errors []string
	for fieldName, detail := range children {
		for _, errMsg := range detail.Errors {
			errors = append(errors, fieldName+": "+errMsg)
		}

		if len(detail.Children) > 0 {
			childErrors := collectFieldErrors(detail.Children)
			for _, childErr := range childErrors {
				errors = append(errors, fieldName+"."+childErr)
			}
		}
	}
	return errors
}

func validateString(s string, maxLength int) string {
	if len(s) > maxLength {
		return utils.TruncateString(s, maxLength)
	}
	return s
}
