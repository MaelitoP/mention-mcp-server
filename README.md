# Mention MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/@MaelitoP/mention-mcp-server.svg)](https://www.npmjs.com/package/@MaelitoP/mention-mcp-server)
[![NPM Downloads](https://img.shields.io/npm/dm/@MaelitoP/mention-mcp-server.svg)](https://www.npmjs.com/package/@MaelitoP/mention-mcp-server)

A comprehensive Model Context Protocol (MCP) server that enables AI assistants to monitor and manage web and social media mentions through the Mention API. This server provides intelligent, plan-aware tools for creating monitoring alerts, analyzing mention data, and managing notification systems.

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
| `pause_alert` | Temporarily disable alert monitoring |
| `unpause_alert` | Resume alert monitoring |
| `estimate_alert` | Get mention volume estimates for criteria |
| `preview_alert` | Preview sample mentions matching criteria |

## Usage with Claude Desktop

Add the following to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mention": {
      "command": "npx",
      "args": ["-y", "@MaelitoP/mention-mcp-server"],
      "env": {
        "MENTION_API_KEY": "your_mention_api_key_here"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MENTION_API_KEY` | Your Mention API authentication token | ✓ |

**Getting your API key:**
1. Sign up at [mention.com](https://mention.com)
2. Navigate to your account settings
3. Generate an API key in the integrations section
4. Copy the key to your configuration

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 **Issues**: [GitHub Issues](https://github.com/MaelitoP/mention-mcp-server/issues)
- 📖 **Documentation**: [API Reference](https://dev.mention.com/)
- 🌐 **Mention Platform**: [mention.com](https://mention.com/)
