package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	MentionAPI MentionAPIConfig `json:"mention_api"`
	Server     ServerConfig     `json:"server"`
}

type MentionAPIConfig struct {
	AccessToken string `json:"access_token"`
	AccountID   string `json:"account_id"`
	GroupID     string `json:"group_id"`
	BaseURL     string `json:"base_url"`
	APIVersion  string `json:"api_version"`
}

type ServerConfig struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Timeout int    `json:"timeout"` // in seconds
}

func DefaultConfig() *Config {
	return &Config{
		MentionAPI: MentionAPIConfig{
			BaseURL:    "https://web.mention.net/api",
			APIVersion: "1.21",
		},
		Server: ServerConfig{
			Name:    "mention-mcp",
			Version: "0.1.0",
			Timeout: 30,
		},
	}
}

func LoadConfig() (*Config, error) {
	config := DefaultConfig()

	if accessToken := os.Getenv("MENTION_ACCESS_TOKEN"); accessToken != "" {
		config.MentionAPI.AccessToken = accessToken
	}
	if accountID := os.Getenv("MENTION_ACCOUNT_ID"); accountID != "" {
		config.MentionAPI.AccountID = accountID
	}

	configPath := getConfigPath()
	if _, err := os.Stat(configPath); err == nil {
		if err := loadConfigFile(config, configPath); err != nil {
			return nil, fmt.Errorf("failed to load config file: %w", err)
		}
	}

	if err := validateConfig(config); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return config, nil
}

func getConfigPath() string {
	homeDir, _ := os.UserHomeDir()
	return filepath.Join(homeDir, ".config", "mention-mcp", "config.json")
}

func loadConfigFile(config *Config, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, config)
}

func validateConfig(config *Config) error {
	hasAccessToken := config.MentionAPI.AccessToken != ""
	if !hasAccessToken {
		return fmt.Errorf("either access token or client credentials (client_id and client_secret) are required")
	}

	return nil
}

func (c *Config) IsAuthenticated() bool {
	return c.MentionAPI.AccessToken != ""
}
