import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "../api-client.js";
import { logInfo } from "../logger.js";
import { AppDataResponseSchema } from "../types.js";

export function registerGetAppDataTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "get_app_data",
    {
      title: "Get Languages, Countries and Sources",
      description:
        "Get application configuration data including available languages, countries, sources, colors, and other metadata needed for creating alerts.",
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
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
        content: [{ type: "text", text: JSON.stringify(filteredResponse, null, 2) }],
      };
    }
  );
}
