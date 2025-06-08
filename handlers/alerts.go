package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"mention-mcp-server/services"
)

// RegisterAlertTools registers all alert-related MCP tools
func RegisterAlertTools(s *server.MCPServer, config *Config) {
	getOptionsToolDefinition := mcp.NewTool("get_alert_options",
		mcp.WithDescription("Get available languages, countries, and sources for creating alerts in Mention"),
	)
	s.AddTool(getOptionsToolDefinition, getAlertOptionsHandler(config))

	createAlertTool := mcp.NewTool("create_basic_alert",
		mcp.WithDescription("Create a new basic monitoring alert in Mention"),
		mcp.WithString("name",
			mcp.Required(),
			mcp.Description("Name of the alert"),
		),
		mcp.WithArray("included_keywords",
			mcp.Required(),
			mcp.MinItems(1),
			mcp.Description("Array of included keywords. Meaning that all of required_keywords must be present in the mention"),
		),
		mcp.WithArray("required_keywords",
			mcp.Description("Array of required keywords. Meaning that at least one of included_keywords must be present in the mention"),
		),
		mcp.WithArray("excluded_keywords",
			mcp.Description("Array of excluded keywords. Meaning that none of excluded_keywords must be present in the mention"),
		),
		mcp.WithArray("sources",
			mcp.Required(),
			mcp.MinItems(1),
			mcp.Description("Array of source types to monitor. Use get_alert_options tool to see available sources. Common options: web, twitter, facebook, instagram, news, blogs"),
		),
		mcp.WithArray("languages",
			mcp.Required(),
			mcp.MinItems(1),
			mcp.MaxItems(10),
			mcp.Description("Array of 2-character language codes (e.g., 'en', 'fr', 'es'). Use get_alert_options tool to see all available languages"),
		),
		mcp.WithArray("countries",
			mcp.Description("Array of 2-character country codes (e.g., 'US', 'FR', 'GB'). Use get_alert_options tool to see all available countries. Use 'XX' for mentions without country information"),
		),
	)
	s.AddTool(createAlertTool, createAlertHandler(config))
}

func createAlertHandler(config *Config) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		name, err := request.RequireString("name")
		if err != nil {
			return mcp.NewToolResultError("name parameter is required"), nil
		}

		includedKeywords, err := request.RequireStringSlice("included_keywords")
		if err != nil {
			return mcp.NewToolResultError("included_keywords parameter is required"), nil
		}

		requiredKeywords := request.GetStringSlice("required_keywords", nil)
		excludedKeywords := request.GetStringSlice("excluded_keywords", nil)
		sources := request.GetStringSlice("sources", nil)
		languages := request.GetStringSlice("languages", nil)
		countries := request.GetStringSlice("countries", nil)

		req := services.AlertCreateRequest{
			Name:             name,
			IncludedKeywords: includedKeywords,
			RequiredKeywords: requiredKeywords,
			ExcludedKeywords: excludedKeywords,
			Sources:          sources,
			Languages:        languages,
			Countries:        countries,
		}

		if reqJSON, err := json.Marshal(req); err == nil {
			config.Logger.Info(fmt.Sprintf("CreateBasicAlert request: %s", string(reqJSON)))
		} else {
			config.Logger.Error("Failed to marshal request: %v", err)
		}

		alert, err := config.AlertService.CreateBasicAlert(ctx, req)
		if err != nil {
			config.Logger.Error("Failed to create alert: %v", err)
			return mcp.NewToolResultError(formatError(err)), nil
		}

		alertJSON, err := json.MarshalIndent(alert, "", "  ")
		if err != nil {
			config.Logger.Error("Failed to marshal alert response: %v", err)
			return mcp.NewToolResultError("Failed to format response"), nil
		}

		return mcp.NewToolResultText(string(alertJSON)), nil
	}
}

func getAlertOptionsHandler(config *Config) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		appData, err := config.AlertService.GetAppData(ctx)
		if err != nil {
			config.Logger.Error("Failed to get app data: %v", err)
			return mcp.NewToolResultError(formatError(err)), nil
		}

		response := map[string]interface{}{
			"languages": make(map[string]string),
			"countries": appData.AlertCountries,
			"sources":   make(map[string]string),
		}

		for code, lang := range appData.AlertLanguages {
			response["languages"].(map[string]string)[code] = lang.Name
		}

		for code, source := range appData.AlertSources {
			response["sources"].(map[string]string)[code] = source.Name
		}

		responseJSON, err := json.MarshalIndent(response, "", "  ")
		if err != nil {
			config.Logger.Error("Failed to marshal app data response: %v", err)
			return mcp.NewToolResultError("Failed to format response"), nil
		}

		return mcp.NewToolResultText(string(responseJSON)), nil
	}
}
