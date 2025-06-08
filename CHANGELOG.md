# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-08

### Added
- Initial release of the Mention MCP Server
- Complete implementation of Mention API integration
- Plan-aware alert creation (basic vs advanced)
- 12 comprehensive tools for account and alert management
- Zod schema validation with JSON Schema conversion
- TypeScript support with full type safety
- Biome.js linting and formatting
- GitHub Actions CI/CD pipeline
- Comprehensive error handling with JSON-RPC format
- Support for both local development and npm package usage

### Features
- **Account Management**: Get account info and application data
- **Alert Creation**: Basic and advanced alert creation with plan detection
- **Alert Management**: Update, pause/unpause existing alerts
- **Preview & Estimation**: Test alert criteria before creation
- **Full API Coverage**: All major Mention API endpoints supported

### Tools Available
- `get_account_info` - Account information and subscription details
- `get_app_data` - Available languages, countries, sources metadata
- `list_alerts` - List all monitoring alerts with pagination
- `get_alert` - Get specific alert details
- `create_basic_alert` - Create alerts for basic subscription plans
- `create_advanced_alert` - Create alerts with boolean queries for advanced plans
- `update_alert` - Update existing alerts
- `pause_alert` / `unpause_alert` - Control alert monitoring
- `estimate_alert` - Estimate mention volume for alert criteria
- `preview_alert` - Preview sample mentions for alert criteria
