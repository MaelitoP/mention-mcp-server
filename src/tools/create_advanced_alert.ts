import { zodToJsonSchema } from "zod-to-json-schema";
import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { CreateAdvancedAlertArgsSchema, CreateAlertResponseSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createAdvancedAlertHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(args: unknown): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const validated = CreateAdvancedAlertArgsSchema.parse(args);
        const accountId = await apiClient.getAccountId();

        const { query_string, ...requestData } = validated;

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
          alertName: validated.name,
          alertId: data.alert.id,
        });

        return {
          content: [
            {
              type: "text",
              text: data.alert.id,
            },
          ],
        };
      } catch (error) {
        // Check if this is a boolean query validation error
        if (error instanceof Error && error.message.includes("boolean_errors")) {
          logError("Boolean query validation failed", error);
          throw new Error(`Boolean query validation failed. Common issues:
- Use url:domain.com instead of domain.com for websites
- Ensure proper boolean operators (AND, OR, NOT)
- Use quotes for phrases: "cold email"
- Max 1700 characters
- Example: (Lemlist OR url:lemlist.com OR "cold email") AND -spam

Original error: ${error.message}`);
        }

        logError("Failed to create advanced alert", error);
        throw error;
      }
    },
  };
}

export const createAdvancedAlertTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "create_advanced_alert",
      description:
        "Create a new advanced monitoring alert with boolean query syntax. Advanced alerts use complex query strings with boolean operators like AND, OR, NOT.",
      inputSchema: zodToJsonSchema(CreateAdvancedAlertArgsSchema),
    };
  },
  createHandler: createAdvancedAlertHandler,
};
