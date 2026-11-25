import { zodToJsonSchema } from "zod-to-json-schema";
import { type MentionAPIClient, apiPath } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { PauseAlertArgsSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createPauseAlertHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(args: unknown): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const { alert_id } = PauseAlertArgsSchema.parse(args);
        const accountId = await apiClient.getAccountId();

        await apiClient.makeRequest(apiPath`/accounts/${accountId}/alerts/${alert_id}/pause`, {
          method: "POST",
        });

        logInfo("Alert paused", { accountId, alertId: alert_id });

        return {
          content: [
            {
              type: "text",
              text: `Alert ${alert_id} paused.`,
            },
          ],
        };
      } catch (error) {
        logError("Failed to pause alert", error);
        throw error;
      }
    },
  };
}

export const pauseAlertTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "pause_alert",
      description: "Temporarily pause monitoring for a specific alert.",
      inputSchema: zodToJsonSchema(PauseAlertArgsSchema),
    };
  },
  createHandler: createPauseAlertHandler,
};
