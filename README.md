# Mention MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/@maelitop/mention-mcp-server.svg)](https://www.npmjs.com/package/@maelitop/mention-mcp-server)
[![NPM Downloads](https://img.shields.io/npm/dm/@maelitop/mention-mcp-server.svg)](https://www.npmjs.com/package/@MaelitoP/mention-mcp-server)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server for social listening and monitoring through the Mention API. Built with TypeScript, comprehensive error handling, structured logging, and modular architecture.

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
| `search_mentions` | Search an alert's mentions, returned as compact records with a next-page token |
| `fetch_alert_stats` | Get comprehensive statistics for alerts |

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
        "MENTION_API_KEY": "your_mention_api_key_here"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MENTION_API_KEY` | Your Mention API key (required) | - |
| `MENTION_API_BASE_URL` | Custom API base URL | `https://web.mention.com/api` |
| `MCP_LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` |
| `MCP_REQUEST_TIMEOUT` | Request timeout in milliseconds, a whole number from `1` to `2147483647` | `30000` |
| `MENTION_READ_ONLY` | `true` registers only the read-only tools (`get_account_info`, `get_app_data`, `list_alerts`, `get_alert`, `search_mentions`, `fetch_alert_stats`), so alerts cannot be created, updated, paused or unpaused; `false`, an empty value or leaving it unset registers every tool. Any other value stops the server at startup | `false` |


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

# Run linting, build and tests
npm run ci
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test -- --watch
```

## Releasing

1. On an up-to-date `main`, move the `## [Unreleased]` entries of `CHANGELOG.md` under a heading for the new version and commit.
2. Bump the version, commit it and create the `v<version>` tag:
   ```bash
   npm version patch -m "chore(release): %s"   # or minor, major
   ```
3. Push the commit and the tag:
   ```bash
   git push origin main --follow-tags
   ```

Pushing a `v*` tag runs the Publish workflow: it checks, builds and tests the package, publishes it to npm through trusted publishing (no npm token) and creates the GitHub release with generated notes.

## License

This project is licensed under the [MIT License](LICENSE).
