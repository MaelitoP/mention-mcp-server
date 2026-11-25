import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type MentionAPIClient, apiPath } from "../api-client.js";
import { logInfo } from "../logger.js";
import { GetAlertArgsSchema } from "../types.js";

export function registerGetAlertTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "get_alert",
    {
      description: "Get detailed information about a specific alert by its ID.",
      inputSchema: GetAlertArgsSchema.shape,
    },
    async ({ alert_id }) => {
      const accountId = await apiClient.getAccountId();

      const data = await apiClient.makeRequest(apiPath`/accounts/${accountId}/alerts/${alert_id}`);

      logInfo("Alert retrieved", { accountId, alertId: alert_id });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
