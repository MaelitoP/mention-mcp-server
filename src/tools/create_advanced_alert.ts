import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "../api-client.js";
import { logInfo } from "../logger.js";
import { CreateAdvancedAlertArgsSchema, CreateAlertResponseSchema } from "../types.js";

export function registerCreateAdvancedAlertTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "create_advanced_alert",
    {
      description:
        "Create a new advanced monitoring alert with boolean query syntax. Advanced alerts use complex query strings with boolean operators like AND, OR, NOT.",
      inputSchema: CreateAdvancedAlertArgsSchema.shape,
    },
    async ({ query_string, ...requestData }) => {
      try {
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
      } catch (error) {
        if (error instanceof Error && error.message.includes("boolean_errors")) {
          throw new Error(
            `Boolean query validation failed. Common issues:
- Use url:domain.com instead of domain.com for websites
- Ensure proper boolean operators (AND, OR, NOT)
- Use quotes for phrases: "cold email"
- Max 1700 characters
- Example: (Lemlist OR url:lemlist.com OR "cold email") AND -spam

Original error: ${error.message}`,
            { cause: error }
          );
        }
        throw error;
      }
    }
  );
}
