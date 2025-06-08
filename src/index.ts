#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const API_BASE_URL = "https://web.mention.com/api";

const ListAlertsArgsSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum number of alerts to return (1-100)"),
  cursor: z.string().optional().describe("Pagination cursor for retrieving next page"),
});

const GetAlertArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID to retrieve"),
});

const CreateBasicAlertArgsSchema = z.object({
  name: z.string().min(1).max(255).describe("Alert name (required, 1-255 characters)"),
  description: z
    .string()
    .max(1000)
    .optional()
    .describe("Alert description (optional, max 1000 characters)"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe("Alert color code (e.g., '#05e363')"),
  included_keywords: z
    .array(z.string())
    .min(1)
    .describe("Keywords to include - at least one keyword that should be present in mentions"),
  required_keywords: z
    .array(z.string())
    .optional()
    .describe("Keywords that must be present in all mentions (optional)"),
  excluded_keywords: z
    .array(z.string())
    .optional()
    .describe("Keywords to exclude from mentions (optional)"),
  monitored_website: z
    .object({
      domain: z.string().describe("Domain to specifically monitor"),
      block_self: z.boolean().optional().describe("Whether to block mentions from own site"),
    })
    .optional()
    .describe("Specific website monitoring configuration (optional)"),
  languages: z.array(z.string()).max(5).optional().describe("Language codes to monitor (max 5)"),
  countries: z.array(z.string()).optional().describe("Country codes to monitor"),
  sources: z
    .array(z.enum(["twitter", "news", "web", "blogs", "videos", "forums", "images", "facebook"]))
    .optional()
    .describe("Sources to monitor"),
  blocked_sites: z.array(z.string()).optional().describe("Domains to exclude from monitoring"),
  noise_detection: z
    .boolean()
    .default(true)
    .optional()
    .describe("Enable noise detection (default: true)"),
});

const CreateAdvancedAlertArgsSchema = z.object({
  name: z.string().min(1).max(255).describe("Alert name (required, 1-255 characters)"),
  description: z
    .string()
    .max(1000)
    .optional()
    .describe("Alert description (optional, max 1000 characters)"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe("Alert color code (e.g., '#05e363')"),
  query_string: z
    .string()
    .describe(
      "Advanced query string with boolean operators (e.g., '(NASA OR SpaceX) AND mars NOT nose')"
    ),
  languages: z.array(z.string()).max(5).optional().describe("Language codes to monitor (max 5)"),
  countries: z.array(z.string()).optional().describe("Country codes to monitor"),
  sources: z
    .array(z.enum(["twitter", "news", "web", "blogs", "videos", "forums", "images", "facebook"]))
    .optional()
    .describe("Sources to monitor"),
  blocked_sites: z.array(z.string()).optional().describe("Domains to exclude from monitoring"),
  noise_detection: z
    .boolean()
    .default(true)
    .optional()
    .describe("Enable noise detection (default: true)"),
});

const UpdateAlertArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID to update"),
  name: z.string().min(1).max(255).optional().describe("New alert name (1-255 characters)"),
  description: z
    .string()
    .max(1000)
    .optional()
    .describe("New alert description (max 1000 characters)"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe("New alert color code"),
  query_type: z.enum(["basic", "advanced"]).optional().describe("Type of query to update"),
  included_keywords: z
    .array(z.string())
    .optional()
    .describe("Keywords to include (for basic queries)"),
  required_keywords: z
    .array(z.string())
    .optional()
    .describe("Required keywords (for basic queries)"),
  excluded_keywords: z
    .array(z.string())
    .optional()
    .describe("Excluded keywords (for basic queries)"),
  query_string: z.string().optional().describe("Advanced query string (for advanced queries)"),
  languages: z.array(z.string()).max(5).optional().describe("Language codes to monitor (max 5)"),
  countries: z.array(z.string()).optional().describe("Country codes to monitor"),
  sources: z
    .array(z.enum(["twitter", "news", "web", "blogs", "videos", "forums", "images", "facebook"]))
    .optional()
    .describe("Sources to monitor"),
  blocked_sites: z.array(z.string()).optional().describe("Domains to exclude from monitoring"),
  noise_detection: z.boolean().optional().describe("Enable noise detection"),
});

const PauseAlertArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID to pause"),
});

const UnpauseAlertArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID to unpause"),
});

interface MentionAPIError {
  error: {
    code: number;
    message: string;
    details?: string;
  };
}

function logError(message: string, error?: unknown) {
  const errorData = {
    error: {
      code: -32603,
      message: message,
      data: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    },
  };
  console.error(JSON.stringify(errorData));
}

async function makeAPIRequest(endpoint: string, options: RequestInit = {}) {
  const apiKey = process.env.MENTION_API_KEY;
  if (!apiKey) {
    const errorMsg = "MENTION_API_KEY environment variable is required";
    logError(errorMsg);
    throw new McpError(ErrorCode.InvalidRequest, errorMsg);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: MentionAPIError;
      try {
        errorData = (await response.json()) as MentionAPIError;
      } catch {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        logError(`Mention API request failed: ${errorMsg}`, { endpoint, status: response.status });
        throw new McpError(ErrorCode.InternalError, errorMsg);
      }

      const errorMsg = `Mention API Error: ${errorData.error.message}${
        errorData.error.details ? ` - ${errorData.error.details}` : ""
      }`;
      logError(`Mention API error: ${errorMsg}`, { endpoint, errorData });
      throw new McpError(ErrorCode.InternalError, errorMsg);
    }

    return response.json();
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    const errorMsg = `Network request failed: ${error instanceof Error ? error.message : String(error)}`;
    logError(errorMsg, { endpoint, error });
    throw new McpError(ErrorCode.InternalError, errorMsg);
  }
}

const server = new Server(
  {
    name: "mention-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_account_info",
        description:
          "Get current account information including subscription plan, account ID, and capabilities. This tool should be called first to understand account limitations and determine which alert creation tools are available.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_app_data",
        description:
          "Get application configuration data including available languages, countries, sources, colors, and other metadata needed for creating alerts.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "list_alerts",
        description: "List all monitoring alerts for the current account with pagination support.",
        inputSchema: zodToJsonSchema(ListAlertsArgsSchema),
      },
      {
        name: "get_alert",
        description: "Get detailed information about a specific alert by its ID.",
        inputSchema: zodToJsonSchema(GetAlertArgsSchema),
      },
      {
        name: "create_basic_alert",
        description:
          "Create a new basic monitoring alert. Basic alerts use simple keyword matching with included_keywords, required_keywords, and excluded_keywords arrays.",
        inputSchema: zodToJsonSchema(CreateBasicAlertArgsSchema),
      },
      {
        name: "create_advanced_alert",
        description:
          "Create a new advanced monitoring alert with boolean query syntax. Advanced alerts use complex query strings with boolean operators like AND, OR, NOT.",
        inputSchema: zodToJsonSchema(CreateAdvancedAlertArgsSchema),
      },
      {
        name: "update_alert",
        description: "Update an existing alert with new criteria or settings.",
        inputSchema: zodToJsonSchema(UpdateAlertArgsSchema),
      },
      {
        name: "pause_alert",
        description: "Temporarily pause monitoring for a specific alert.",
        inputSchema: zodToJsonSchema(PauseAlertArgsSchema),
      },
      {
        name: "unpause_alert",
        description: "Resume monitoring for a previously paused alert.",
        inputSchema: zodToJsonSchema(UnpauseAlertArgsSchema),
      },
    ],
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [],
  };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_account_info": {
        const data = await makeAPIRequest("/accounts/me");
        
        // Extract only essential information to avoid hitting context limits
        const filteredResponse = {
          accountId: data.account?.id,
          canCreateAdvancedAlert: data.account?.subscription?.advanced_query_access,
          groups: data.account?.groups?.map((group: any) => ({
            id: group.id,
            name: group.name,
          })) || [],
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(filteredResponse, null, 2),
            },
          ],
        };
      }

      case "get_app_data": {
        const data = await makeAPIRequest("/app/data");
        
        // Extract only essential information for alert creation to avoid hitting context limits
        const filteredResponse = {
          languages: Object.entries(data.alert_languages || {}).map(([code, lang]: [string, any]) => ({
            code,
            name: lang.name,
          })),
          countries: data.alert_countries || {},
          sources: Object.entries(data.alert_sources || {})
            .filter(([_, source]: [string, any]) => !source.hidden)
            .map(([code, source]: [string, any]) => ({
              code,
              name: source.name,
            })),
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(filteredResponse, null, 2),
            },
          ],
        };
      }

      case "list_alerts": {
        const { limit, cursor } = ListAlertsArgsSchema.parse(args);

        const accountData = await makeAPIRequest("/accounts/me");
        const accountId = accountData.account.id;

        const queryParams = new URLSearchParams();
        if (limit) queryParams.append("limit", limit.toString());
        if (cursor) queryParams.append("cursor", cursor);

        const endpoint = `/accounts/${accountId}/alerts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
        const data = await makeAPIRequest(endpoint);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_alert": {
        const { alert_id } = GetAlertArgsSchema.parse(args);

        const accountData = await makeAPIRequest("/accounts/me");
        const accountId = accountData.account.id;

        const data = await makeAPIRequest(`/accounts/${accountId}/alerts/${alert_id}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "create_basic_alert": {
        const validated = CreateBasicAlertArgsSchema.parse(args);

        const accountData = await makeAPIRequest("/accounts/me");
        const accountId = accountData.account.id;

        const {
          included_keywords,
          required_keywords,
          excluded_keywords,
          monitored_website,
          ...requestData
        } = validated;

        const requestBody = {
          ...requestData,
          query: {
            type: "basic",
            included_keywords,
            required_keywords,
            excluded_keywords,
            monitored_website,
          },
        };

        const data = await makeAPIRequest(`/accounts/${accountId}/alerts`, {
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "create_advanced_alert": {
        const validated = CreateAdvancedAlertArgsSchema.parse(args);

        const accountData = await makeAPIRequest("/accounts/me");
        const accountId = accountData.account.id;

        const { query_string, ...requestData } = validated;

        const requestBody = {
          ...requestData,
          query: {
            type: "advanced",
            query_string,
          },
        };

        const data = await makeAPIRequest(`/accounts/${accountId}/alerts`, {
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "update_alert": {
        const validated = UpdateAlertArgsSchema.parse(args);
        const {
          alert_id,
          query_type,
          included_keywords,
          required_keywords,
          excluded_keywords,
          query_string,
          ...updateData
        } = validated;

        const accountData = await makeAPIRequest("/accounts/me");
        const accountId = accountData.account.id;

        const requestBody: Record<string, unknown> = { ...updateData };

        if (query_type) {
          if (query_type === "basic") {
            requestBody.query = {
              type: "basic",
              included_keywords,
              required_keywords,
              excluded_keywords,
            };
          } else if (query_type === "advanced") {
            requestBody.query = {
              type: "advanced",
              query_string,
            };
          }
        }

        const data = await makeAPIRequest(`/accounts/${accountId}/alerts/${alert_id}`, {
          method: "PUT",
          body: JSON.stringify(requestBody),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "pause_alert": {
        const { alert_id } = PauseAlertArgsSchema.parse(args);

        const accountData = await makeAPIRequest("/accounts/me");
        const accountId = accountData.account.id;

        const data = await makeAPIRequest(`/accounts/${accountId}/alerts/${alert_id}/pause`, {
          method: "POST",
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "unpause_alert": {
        const { alert_id } = UnpauseAlertArgsSchema.parse(args);

        const accountData = await makeAPIRequest("/accounts/me");
        const accountId = accountData.account.id;

        const data = await makeAPIRequest(`/accounts/${accountId}/alerts/${alert_id}/unpause`, {
          method: "POST",
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      logError(`Tool execution error: ${error.message}`, {
        tool: name,
        args,
        error: error.message,
      });
      throw error;
    }

    const errorMsg = `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`;
    logError(errorMsg, { tool: name, args, error });
    throw new McpError(ErrorCode.InternalError, errorMsg);
  }
});

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    logError("Failed to start MCP server", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logError("Fatal error in main", error);
  process.exit(1);
});
