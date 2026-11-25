import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "../api-client.js";
import { logInfo } from "../logger.js";
import { CreateAdvancedAlertArgsSchema, CreateAlertResponseSchema } from "../types.js";

export function registerCreateAdvancedAlertTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "create_advanced_alert",
    {
      title: "Create Advanced Alert",
      description:
        "Create a new advanced monitoring alert with boolean query syntax. Advanced alerts use complex query strings with boolean operators like AND, OR, NOT.",
      inputSchema: CreateAdvancedAlertArgsSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ query_string, ...requestData }) => {
      const accountId = await apiClient.getAccountId();

      const requestBody = {
        ...requestData,
        query: {
          type: "advanced",
          query_string,
        },
      };

      const rawData = await apiClient.makeRequest(`/accounts/${accountId}/alerts`, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const data = CreateAlertResponseSchema.parse(rawData);

      logInfo("Advanced alert created", {
        accountId,
        alertName: requestData.name,
        alertId: data.alert.id,
      });

      return {
        content: [{ type: "text", text: data.alert.id }],
      };
    }
  );
}
