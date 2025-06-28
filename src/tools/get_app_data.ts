import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { AppDataResponseSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createGetAppDataHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const rawData = await apiClient.makeRequest("/app/data");
        const data = AppDataResponseSchema.parse(rawData);

        const filteredResponse = {
          languages: Object.keys(data.alert_languages || {}),
          countries: Object.keys(data.alert_countries || {}),
          sources: Object.entries(data.alert_sources || {})
            .filter(([_, source]) => !source.hidden)
            .map(([code]) => code),
        };

        logInfo("App data retrieved");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(filteredResponse, null, 2),
            },
          ],
        };
      } catch (error) {
        logError("Failed to get app data", error);
        throw error;
      }
    },
  };
}

export const getAppDataTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "get_app_data",
      description:
        "Get application configuration data including available languages, countries, sources, colors, and other metadata needed for creating alerts.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    };
  },
  createHandler: createGetAppDataHandler,
};
