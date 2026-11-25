import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type MentionAPIClient, apiPath } from "../api-client.js";
import { logInfo } from "../logger.js";
import { UnpauseAlertArgsSchema } from "../types.js";

export function registerUnpauseAlertTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "unpause_alert",
    {
      description: "Resume monitoring for a previously paused alert.",
      inputSchema: UnpauseAlertArgsSchema.shape,
    },
    async ({ alert_id }) => {
      const accountId = await apiClient.getAccountId();

      await apiClient.makeRequest(apiPath`/accounts/${accountId}/alerts/${alert_id}/unpause`, {
        method: "POST",
      });

      logInfo("Alert unpaused", { accountId, alertId: alert_id });

      return {
        content: [{ type: "text", text: `Alert ${alert_id} unpaused.` }],
      };
    }
  );
}
