package config

import "time"

const (
	DefaultAPIBaseURL    = "https://web.mention.net/api"
	DefaultAPIVersion    = "1.21"
	DefaultServerName    = "mention-mcp"
	DefaultServerVersion = "0.1.0"
	DefaultTimeout       = 30 * time.Second

	DefaultConfigDir = ".config/mention-mcp"
	ConfigFileName   = "config.json"
	LogsSubDir       = "logs"

	LogDateFormat = "2006-01-02"

	EnvAccessToken = "MENTION_ACCESS_TOKEN"
	EnvAccountID   = "MENTION_ACCOUNT_ID"
	EnvGroupID     = "MENTION_GROUP_ID"
)
