import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type MentionAPIClient, apiPath } from "../api-client.js";
import { logInfo } from "../logger.js";
import { PauseAlertArgsSchema } from "../types.js";

export function registerPauseAlertTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "pause_alert",
    {
      title: "Pause Alert",
      description: "Temporarily pause monitoring for a specific alert.",
      inputSchema: PauseAlertArgsSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ alert_id }) => {
      const accountId = await apiClient.getAccountId();

      await apiClient.makeRequest(apiPath`/accounts/${accountId}/alerts/${alert_id}/pause`, {
        method: "POST",
      });

      logInfo("Alert paused", { accountId, alertId: alert_id });

      return {
        content: [{ type: "text", text: `Alert ${alert_id} paused.` }],
      };
    }
  );
}
