import { zodToJsonSchema } from "zod-to-json-schema";
import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { FetchMentionsArgsSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createFetchMentionsHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(args: unknown): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const validated = FetchMentionsArgsSchema.parse(args);
        const accountId = await apiClient.getAccountId();

        const { alert_id, ...queryParams } = validated;

        const searchParams = new URLSearchParams();

        for (const [key, value] of Object.entries(queryParams)) {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              for (const item of value) {
                searchParams.append(key, String(item));
              }
            } else {
              searchParams.append(key, String(value));
            }
          }
        }

        const queryString = searchParams.toString();
        const endpoint = `/accounts/${accountId}/alerts/${alert_id}/mentions${queryString ? `?${queryString}` : ""}`;

        const data = await apiClient.makeRequest(endpoint);

        logInfo("Mentions fetched successfully", {
          accountId,
          alertId: alert_id,
          endpoint,
          mentionCount: (data as { mentions?: unknown[] })?.mentions?.length || 0,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        logError("Failed to fetch mentions", error);
        throw error;
      }
    },
  };
}

export const fetchMentionsTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "fetch_mentions",
      description:
        "Retrieve mentions associated with a specific alert. Supports various filters like source, folder, tone, countries, languages, and advanced search queries.",
      inputSchema: zodToJsonSchema(FetchMentionsArgsSchema),
    };
  },
  createHandler: createFetchMentionsHandler,
};
