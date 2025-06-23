import { zodToJsonSchema } from "zod-to-json-schema";
import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { GetAlertArgsSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createGetAlertHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(args: unknown): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const { alert_id } = GetAlertArgsSchema.parse(args);
        const accountId = await apiClient.getAccountId();

        const data = await apiClient.makeRequest(`/accounts/${accountId}/alerts/${alert_id}`);

        logInfo("Alert retrieved", { accountId, alertId: alert_id });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        logError("Failed to get alert", error);
        throw error;
      }
    },
  };
}

export const getAlertTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "get_alert",
      description: "Get detailed information about a specific alert by its ID.",
      inputSchema: zodToJsonSchema(GetAlertArgsSchema),
    };
  },
  createHandler: createGetAlertHandler,
};
