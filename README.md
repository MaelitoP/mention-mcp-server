# Mention MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/@maelitop/mention-mcp-server.svg)](https://www.npmjs.com/package/@maelitop/mention-mcp-server)
[![NPM Downloads](https://img.shields.io/npm/dm/@maelitop/mention-mcp-server.svg)](https://www.npmjs.com/package/@MaelitoP/mention-mcp-server)

A production-ready [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server for social listening and monitoring through the Mention API. Built with TypeScript, comprehensive error handling, structured logging, and modular architecture.

## Supported Tools

| Tool | Description |
|------|-------------|
| `get_account_info` | Retrieve account details and subscription plan |
| `get_app_data` | Get available languages, countries, sources |
| `list_alerts` | List all monitoring alerts with pagination |
| `get_alert` | Get detailed information about specific alerts |
| `create_basic_alert` | Create alerts with simple keyword matching |
| `create_advanced_alert` | Create alerts with boolean query syntax |
| `update_alert` | Modify existing alert criteria and settings |
| `pause_alert` | Temporarily pause monitoring for specific alerts |
| `unpause_alert` | Resume monitoring for paused alerts |
| `fetch_mentions` | Retrieve mentions with advanced filtering |

## Installation & Usage

### Quick Start with Claude Desktop

Add the following to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "mention": {
      "command": "npx",
      "args": ["-y", "@maelitop/mention-mcp-server"],
      "env": {
        "MCP_MENTION_API_KEY": "your_mention_api_key_here"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_MENTION_API_KEY` | Your Mention API key (required) | - |
| `MCP_MENTION_API_BASE_URL` | Custom API base URL | `https://web.mention.com/api` |
| `MCP_LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` |
| `MCP_CONSOLE_LOGGING` | Enable console logging (`true`/`false`) | `false` |
| `MCP_REQUEST_TIMEOUT` | Request timeout in milliseconds | `30000` |
| `MCP_MAX_RETRIES` | Maximum retry attempts | `3` |


### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Run linting and type checking
npm run ci
```

## Logging

Logs are automatically written to platform-specific directories:

- **macOS**: `~/Library/Logs/mention-mcp-server/mention-mcp-server.log`
- **Windows**: `~/AppData/Local/mention-mcp-server/logs/mention-mcp-server.log`
- **Linux**: `~/.local/share/mention-mcp-server/logs/mention-mcp-server.log`

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test -- --watch
```

## License

This project is licensed under the [MIT License](LICENSE).
