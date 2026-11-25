import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "../api-client.js";
import { logInfo } from "../logger.js";
import { CreateAlertResponseSchema, CreateBasicAlertArgsSchema } from "../types.js";

export function registerCreateBasicAlertTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "create_basic_alert",
    {
      description:
        "Create a new basic monitoring alert. Basic alerts use simple keyword matching with included_keywords, required_keywords, and excluded_keywords arrays.",
      inputSchema: CreateBasicAlertArgsSchema.shape,
    },
    async ({
      included_keywords,
      required_keywords,
      excluded_keywords,
      monitored_website,
      ...requestData
    }) => {
      const accountId = await apiClient.getAccountId();

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

      const rawData = await apiClient.makeRequest(`/accounts/${accountId}/alerts`, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const data = CreateAlertResponseSchema.parse(rawData);

      logInfo("Basic alert created", {
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
