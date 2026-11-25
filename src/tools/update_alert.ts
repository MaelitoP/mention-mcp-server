import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type MentionAPIClient, apiPath } from "../api-client.js";
import { logInfo } from "../logger.js";
import { UpdateAlertArgsSchema } from "../types.js";

export function registerUpdateAlertTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "update_alert",
    {
      description: "Update an existing alert with new criteria or settings.",
      inputSchema: UpdateAlertArgsSchema.shape,
    },
    async ({
      alert_id,
      included_keywords,
      required_keywords,
      excluded_keywords,
      query_string,
      ...updateData
    }) => {
      const hasKeywords =
        included_keywords !== undefined ||
        required_keywords !== undefined ||
        excluded_keywords !== undefined;

      // Not a .refine: McpServer lists a zod v3 ZodEffects input schema as an object without properties.
      if (query_string !== undefined && hasKeywords) {
        throw new Error(
          "query_string cannot be combined with included_keywords, required_keywords or excluded_keywords"
        );
      }

      const accountId = await apiClient.getAccountId();

      const requestBody: Record<string, unknown> = { ...updateData };

      if (query_string !== undefined) {
        requestBody.query = {
          type: "advanced",
          query_string,
        };
      } else if (hasKeywords) {
        requestBody.query = {
          type: "basic",
          included_keywords,
          required_keywords,
          excluded_keywords,
        };
      }

      const data = await apiClient.makeRequest(apiPath`/accounts/${accountId}/alerts/${alert_id}`, {
        method: "PUT",
        body: JSON.stringify(requestBody),
      });

      logInfo("Alert updated", { accountId, alertId: alert_id });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
