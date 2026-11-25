import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "../api-client.js";
import { logInfo } from "../logger.js";
import { ListAlertsArgsSchema } from "../types.js";

export function registerListAlertsTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "list_alerts",
    {
      description: "List all monitoring alerts for the current account with pagination support.",
      inputSchema: ListAlertsArgsSchema.shape,
    },
    async ({ limit, cursor }) => {
      const accountId = await apiClient.getAccountId();

      const queryParams = new URLSearchParams();
      if (limit) queryParams.append("limit", limit.toString());
      if (cursor) queryParams.append("cursor", cursor);

      const endpoint = `/accounts/${accountId}/alerts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const data = await apiClient.makeRequest(endpoint);

      logInfo("Alerts listed", { accountId, limit, cursor });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
