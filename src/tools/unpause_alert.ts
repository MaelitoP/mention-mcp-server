import { zodToJsonSchema } from "zod-to-json-schema";
import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { UnpauseAlertArgsSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createUnpauseAlertHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(args: unknown): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const { alert_id } = UnpauseAlertArgsSchema.parse(args);
        const accountId = await apiClient.getAccountId();

        const data = await apiClient.makeRequest(
          `/accounts/${accountId}/alerts/${alert_id}/unpause`,
          {
            method: "POST",
          }
        );

        logInfo("Alert unpaused", { accountId, alertId: alert_id });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        logError("Failed to unpause alert", error);
        throw error;
      }
    },
  };
}

export const unpauseAlertTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "unpause_alert",
      description: "Resume monitoring for a previously paused alert.",
      inputSchema: zodToJsonSchema(UnpauseAlertArgsSchema),
    };
  },
  createHandler: createUnpauseAlertHandler,
};
