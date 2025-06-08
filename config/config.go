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
			BaseURL:    DefaultAPIBaseURL,
			APIVersion: DefaultAPIVersion,
		},
		Server: ServerConfig{
			Name:    DefaultServerName,
			Version: DefaultServerVersion,
			Timeout: int(DefaultTimeout.Seconds()),
		},
	}
}

func LoadConfig() (*Config, error) {
	config := DefaultConfig()

	if accessToken := os.Getenv(EnvAccessToken); accessToken != "" {
		config.MentionAPI.AccessToken = accessToken
	}
	if accountID := os.Getenv(EnvAccountID); accountID != "" {
		config.MentionAPI.AccountID = accountID
	}
	if groupID := os.Getenv(EnvGroupID); groupID != "" {
		config.MentionAPI.GroupID = groupID
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
	return filepath.Join(homeDir, DefaultConfigDir, ConfigFileName)
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
		return fmt.Errorf("access token are required")
	}

	return nil
}

func (c *Config) IsAuthenticated() bool {
	return c.MentionAPI.AccessToken != ""
}
