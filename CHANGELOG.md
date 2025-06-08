# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0

### Added
- Initial release of the Mention MCP Server
- Complete implementation of Mention API integration

### Features
- **Account Management**: Get account info and application data
- **Alert Creation**: Basic and advanced alert creation with plan detection
- **Alert Management**: Update, pause/unpause existing alerts

### Tools Available
- `get_account_info` - Account information and subscription details
- `get_app_data` - Available languages, countries, sources metadata
- `list_alerts` - List all monitoring alerts with pagination
- `get_alert` - Get specific alert details
- `create_basic_alert` - Create alerts for basic subscription plans
- `create_advanced_alert` - Create alerts with boolean queries for advanced plans
- `update_alert` - Update existing alerts
