# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-06-29

### Added
- **New Tool**: `fetch_alert_stats` - Retrieve comprehensive alert statistics
  - Flexible date range filtering with `from`, `to`, and `timezone` parameters
  - Aggregation by interval: daily (P1D), weekly (P1W), monthly (P1M)
  - Multi-dimensional filtering by `tones`, `languages`, `sources`, `countries`, `tags`
  - Statistical analysis with `favorite`, `important`, and author influence filtering
  - Geographic insights with configurable `country_stats` (top N countries)
  - Temporal analysis with `week_day_stats` and `week_day_by_hour_stats`
  - Influencer tracking and reach metrics per interval

## [1.3.0] - 2025-06-28

### Added
- **New Tool**: `fetch_mentions` - Retrieve mentions with comprehensive filtering support
  - Supports pagination with `since_id`, `cursor`, and `limit` parameters
  - Date filtering with `before_date`, `not_before_date`, and `timezone`
  - Content filtering by `source`, `folder`, `tone`, `unread`, `favorite`
  - Geographic and language filtering with `countries` and `languages`
  - Advanced search with `q` parameter and sorting options
  - Support for including child mentions with `include_children`

### Changed
- **Alert Creation Response**: `create_basic_alert` and `create_advanced_alert` now return only the alert ID instead of the full response for cleaner output
- **Improved Error Handling**: Enhanced API error logging with full response bodies for better debugging

### Fixed
- **Boolean Query Validation**: Added better error messages for boolean query syntax errors in advanced alerts
- **API Response Parsing**: Improved error handling when API responses don't match expected structure

## [1.2.0] - 2025-06-28

### Added
- **Custom Prompt**: `build-boolean-query` prompt for generating valid Boolean query strings
- **Enhanced Alert Creation**: Improved validation and error messages for alert creation

### Changed
- **Response Format**: Streamlined alert creation responses to return essential data only

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
- `pause_alert` - Temporarily pause monitoring for specific alerts
- `unpause_alert` - Resume monitoring for paused alerts
