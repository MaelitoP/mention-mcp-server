import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type MentionAPIClient, apiPath } from "../api-client.js";
import { logInfo } from "../logger.js";
import { FetchMentionsArgsSchema } from "../types.js";

export function registerFetchMentionsTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "fetch_mentions",
    {
      description:
        "Retrieve mentions associated with a specific alert. Supports various filters like source, folder, tone, countries, and advanced search queries.",
      inputSchema: FetchMentionsArgsSchema.shape,
    },
    async ({ alert_id, ...queryParams }) => {
      const accountId = await apiClient.getAccountId();

      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            for (const item of value) {
              searchParams.append(`${key}[]`, String(item));
            }
          } else {
            searchParams.append(key, String(value));
          }
        }
      }

      const queryString = searchParams.toString();
      const path = apiPath`/accounts/${accountId}/alerts/${alert_id}/mentions`;
      const endpoint = queryString ? `${path}?${queryString}` : path;

      const data = await apiClient.makeRequest(endpoint);

      logInfo("Mentions fetched successfully", {
        accountId,
        alertId: alert_id,
        endpoint,
        mentionCount: (data as { mentions?: unknown[] })?.mentions?.length || 0,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
