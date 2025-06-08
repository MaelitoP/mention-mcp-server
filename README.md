# Mention MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/@MaelitoP/mention-mcp-server.svg)](https://www.npmjs.com/package/@MaelitoP/mention-mcp-server)
[![NPM Downloads](https://img.shields.io/npm/dm/@MaelitoP/mention-mcp-server.svg)](https://www.npmjs.com/package/@MaelitoP/mention-mcp-server)

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) is an open protocol designed for effortless integration between LLM applications and external data sources or tools, offering a standardized framework to seamlessly provide LLMs with the context they require.

This server supplies tools designed to support social listening and monitoring capabilities through the Mention API.

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

## Usage with Claude Desktop

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

## License

This project is licensed under the [MIT License](LICENSE).
