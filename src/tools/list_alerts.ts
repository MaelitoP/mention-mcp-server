import { zodToJsonSchema } from "zod-to-json-schema";
import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { ListAlertsArgsSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createListAlertsHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(args: unknown): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const { limit, cursor } = ListAlertsArgsSchema.parse(args);
        const accountId = await apiClient.getAccountId();

        const queryParams = new URLSearchParams();
        if (limit) queryParams.append("limit", limit.toString());
        if (cursor) queryParams.append("cursor", cursor);

        const endpoint = `/accounts/${accountId}/alerts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
        const data = await apiClient.makeRequest(endpoint);

        logInfo("Alerts listed", { accountId, limit, cursor });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        logError("Failed to list alerts", error);
        throw error;
      }
    },
  };
}

export const listAlertsTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "list_alerts",
      description: "List all monitoring alerts for the current account with pagination support.",
      inputSchema: zodToJsonSchema(ListAlertsArgsSchema),
    };
  },
  createHandler: createListAlertsHandler,
};
