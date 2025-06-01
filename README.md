# Mention MCP Server

A Model Context Protocol (MCP) server for integrating with Mention's brand monitoring API. This server enables LLMs to create alerts, fetch mentions, analyze sentiment, and manage brand monitoring workflows through Mention's platform.

## Installation

### Prerequisites
- Go 1.21 or later
- Mention API Key

### Build from Source
```bash
git clone https://github.com/MaelitoP/mention-mcp-server.git
cd mention-mcp-server
go mod tidy
go install
```

## Configuration

Create a configuration file at `~/.config/mention-mcp/config.json`:
```json
{
  "mention_api": {
    "access_token": "your-access-token",
    "account_id": "your-account-id",
    "group_id": "your-group-id"
  },
  "server": {
    "name": "mention-mcp",
    "version": "0.1.0",
    "timeout": 30
  }
}
```

## Architecture

```
mention-mcp-server/
├── main.go           # Entry point and MCP server setup
├── config/           # Configuration management
├── client/           # Mention API client
├── handlers/         # MCP tool handlers
├── models/           # Data models
└── utils/            # Utility functions
```

---

Built with the [MCP Go SDK](https://github.com/mark3labs/mcp-go)
