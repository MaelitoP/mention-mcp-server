# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Every tool has a `title` and `annotations`: the read tools are marked `readOnlyHint`, `pause_alert` and `unpause_alert` `idempotentHint`, and `update_alert` `destructiveHint`, so clients no longer have to treat every tool as destructive
- The server returns `instructions` at initialisation; the advice to call `get_account_info` first moved there from that tool's description, which now lists what the tool returns

### Changed
- `@modelcontextprotocol/sdk` upgraded from 1.12 to 1.32; the server now accepts MCP protocol version `2025-11-25`
- A failed tool call, such as a missing or invalid argument, an API error or an unknown tool name, returns a result with `isError: true` and a readable message instead of a JSON-RPC error, so the model can see what went wrong
- An unknown prompt name or invalid `build-boolean-query` arguments return an "Invalid params" error naming the problem instead of an internal error

### Removed
- `resources` capability, which listed no resources
- `zod-to-json-schema` dependency
- Log lines for each tool call (started, completed, failed); failed API requests are still logged

### Fixed
- A 403 keeps the reason the API gives, such as a plan without access to a feature, after "Access denied" instead of dropping it
- A 400 or other API error whose body carries a message shows that message and the HTTP status instead of the raw response body: form errors become one `field: message` line each, and an invalid Boolean query in `create_advanced_alert` lists each error with its line and column, one per line, instead of generic tips and an example query. A 401 and a 429 keep their fixed messages
- `fetch_alert_stats` describes `from` and `to` as calendar days in `timezone`, both included, whose time of day and trailing `Z` are ignored; `interval` says that `P1W` and `P1M` widen the range to whole weeks (Monday to Sunday) or months, and `timezone` that it defaults to UTC

## [1.4.1] - 2026-11-25

### Fixed
- README documents `MENTION_API_KEY` and `MENTION_API_BASE_URL`, the variable names the server reads
- Logs are written as JSON lines to stderr, so a startup failure such as a missing `MENTION_API_KEY` is reported before the process exits and stdout carries only MCP messages
- The server no longer creates a log directory at startup, so a missing or read-only home directory does not crash it
- `fetch_mentions` sends `tone` and `countries` as `tone[]` and `countries[]`, so every tone value applies and a `countries` filter is no longer rejected
- `pause_alert` and `unpause_alert` report success with a short confirmation instead of "Network request failed" when the API answers with an empty body
- Requests send the server's real version in the `User-Agent` header, and `MCP_REQUEST_TIMEOUT` also bounds reading the response body
- `update_alert` applies keyword and `query_string` changes without `query_type`: a keyword field sends a basic query, `query_string` an advanced one, and passing both is rejected
- `update_alert` accepts any source code returned by `get_app_data` in `sources`
- An `MCP_REQUEST_TIMEOUT` that is not a whole number of milliseconds between 1 and 2147483647 stops the server at startup with an error naming the variable, instead of making requests fail; a value with a unit suffix such as `60000ms` is now rejected rather than truncated
- Requests send `Accept-Version: 1.21`, so every user gets the same API behaviour whatever version their API application was created with; alerts returned by `get_alert`, `list_alerts` and `update_alert` now have an empty `stats` field
- `get_alert`, `update_alert`, `pause_alert`, `unpause_alert` and `fetch_mentions` URL-encode `alert_id` and reject an empty, `.` or `..` value, so an `alert_id` can no longer send the request to another endpoint
- `fetch_alert_stats` requires `from`, `to` and `interval`, since the API returns 400 without them, and sends `from` and `to` in the `2026-11-01T00:00:00.0` form the API accepts: each takes a date (`from` starts at 00:00:00, `to` ends at 23:59:59) or a date-time read in `timezone`, whose fractional seconds and trailing `Z` are ignored

### Changed
- `MCP_LOG_LEVEL` accepts `debug`, `info`, `warn` and `error`; any other value falls back to `info` instead of crashing at startup
- The package requires Node.js 22 or later (`engines.node`)
- The published package contains only the compiled server, README, LICENSE and CHANGELOG; tests, type declarations and source maps are no longer shipped

### Removed
- `MCP_CONSOLE_LOGGING` option and the platform-specific log files
- `pino` and `pino-pretty` dependencies
- `languages` parameter of `fetch_mentions`, which the endpoint did not apply
- `query_type` parameter of `update_alert`, now inferred from the fields passed
- `noise_detection` parameter of `create_basic_alert`, `create_advanced_alert` and `update_alert`, which the API does not accept
- Retry-count environment variable and its config field; the server parsed it but never retried requests
- `main` field of `package.json`; the package is a command-line server with no importable API
- `important` parameter of `fetch_alert_stats`, which the API does not accept

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
