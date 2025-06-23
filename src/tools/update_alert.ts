import { zodToJsonSchema } from "zod-to-json-schema";
import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { UpdateAlertArgsSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createUpdateAlertHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(args: unknown): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const validated = UpdateAlertArgsSchema.parse(args);
        const {
          alert_id,
          query_type,
          included_keywords,
          required_keywords,
          excluded_keywords,
          query_string,
          ...updateData
        } = validated;

        const accountId = await apiClient.getAccountId();

        const requestBody: Record<string, unknown> = { ...updateData };

        if (query_type) {
          if (query_type === "basic") {
            requestBody.query = {
              type: "basic",
              included_keywords,
              required_keywords,
              excluded_keywords,
            };
          } else if (query_type === "advanced") {
            requestBody.query = {
              type: "advanced",
              query_string,
            };
          }
        }

        const data = await apiClient.makeRequest(`/accounts/${accountId}/alerts/${alert_id}`, {
          method: "PUT",
          body: JSON.stringify(requestBody),
        });

        logInfo("Alert updated", { accountId, alertId: alert_id });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        logError("Failed to update alert", error);
        throw error;
      }
    },
  };
}

export const updateAlertTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "update_alert",
      description: "Update an existing alert with new criteria or settings.",
      inputSchema: zodToJsonSchema(UpdateAlertArgsSchema),
    };
  },
  createHandler: createUpdateAlertHandler,
};
