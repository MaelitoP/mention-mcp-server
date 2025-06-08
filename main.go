package main

import (
	"flag"
	"os"

	"github.com/mark3labs/mcp-go/server"

	"mention-mcp-server/client"
	"mention-mcp-server/config"
	"mention-mcp-server/handlers"
	"mention-mcp-server/services"
	"mention-mcp-server/utils"
)

func main() {
	sse := flag.Bool("sse", false, "Run in SSE mode (default is studio)")
	debug := flag.Bool("debug", false, "Enable debug logging")
	flag.Parse()

	logger := utils.NewLogger(*debug)

	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Error("Failed to load configuration: %v", err)
		os.Exit(1)
	}

	if !cfg.IsAuthenticated() {
		logger.Error("No valid authentication found. Please set MENTION_ACCESS_TOKEN.")
		os.Exit(1)
	}

	mentionClient := client.NewClient(cfg, logger)
	alertService := services.NewAlertService(mentionClient, logger)

	s := server.NewMCPServer(
		cfg.Server.Name,
		cfg.Server.Version,
	)

	handlerConfig := &handlers.Config{
		Client:       mentionClient,
		Logger:       logger,
		AlertService: alertService,
	}

	handlers.RegisterAlertTools(s, handlerConfig)

	if *sse {
		sseServer := server.NewSSEServer(s)
		logger.Info("Starting SSE server on localhost:8080")

		if err := sseServer.Start(":8080"); err != nil {
			logger.Error("SSE server error: %v", err)
			os.Exit(1)
		}
	} else {
		if err := server.ServeStdio(s); err != nil {
			logger.Error("Server error: %v", err)
			os.Exit(1)
		}
	}
}
