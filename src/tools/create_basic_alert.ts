import { zodToJsonSchema } from "zod-to-json-schema";
import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { CreateBasicAlertArgsSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createBasicAlertHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(args: unknown): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const validated = CreateBasicAlertArgsSchema.parse(args);
        const accountId = await apiClient.getAccountId();

        const {
          included_keywords,
          required_keywords,
          excluded_keywords,
          monitored_website,
          ...requestData
        } = validated;

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

        const data = await apiClient.makeRequest(`/accounts/${accountId}/alerts`, {
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        logInfo("Basic alert created", { accountId, alertName: validated.name });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        logError("Failed to create basic alert", error);
        throw error;
      }
    },
  };
}

export const createBasicAlertTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "create_basic_alert",
      description:
        "Create a new basic monitoring alert. Basic alerts use simple keyword matching with included_keywords, required_keywords, and excluded_keywords arrays.",
      inputSchema: zodToJsonSchema(CreateBasicAlertArgsSchema),
    };
  },
  createHandler: createBasicAlertHandler,
};
