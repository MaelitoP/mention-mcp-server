package handlers

import (
	"mention-mcp-server/client"
	"mention-mcp-server/utils"
)

type Config struct {
	Client *client.Client
	Logger utils.Logger
}

const (
	MaxStringLength = 1000
)

func formatError(err error) string {
	return utils.FormatErrorResponse(err)
}

func validateString(s string, maxLength int) string {
	if len(s) > maxLength {
		return utils.TruncateString(s, maxLength)
	}
	return s
}
