import { zodToJsonSchema } from "zod-to-json-schema";
import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import { FetchAlertStatsArgsSchema } from "../types.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createFetchAlertStatsHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(args: unknown): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
        const validated = FetchAlertStatsArgsSchema.parse(args);
        const accountId = await apiClient.getAccountId();

        // Build query parameters
        const searchParams = new URLSearchParams();

        // Handle the required alerts array
        for (const alertId of validated.alerts) {
          searchParams.append("alerts[]", alertId);
        }

        // Handle optional parameters
        const optionalParams = {
          from: validated.from,
          to: validated.to,
          timezone: validated.timezone,
          interval: validated.interval,
          favorite: validated.favorite,
          important: validated.important,
          week_day_stats: validated.week_day_stats,
          week_day_by_hour_stats: validated.week_day_by_hour_stats,
          influencers: validated.influencers,
          reach_per_interval_stats: validated.reach_per_interval_stats,
          "author_influence.score": validated["author_influence.score"],
        };

        for (const [key, value] of Object.entries(optionalParams)) {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        }

        // Handle array parameters
        const arrayParams = {
          "tones[]": validated.tones,
          "languages[]": validated.languages,
          "sources[]": validated.sources,
          "countries[]": validated.countries,
          "tags[]": validated.tags,
        };

        for (const [key, values] of Object.entries(arrayParams)) {
          if (values && Array.isArray(values)) {
            for (const value of values) {
              searchParams.append(key, String(value));
            }
          }
        }

        // Handle special country_stats parameter
        if (validated.country_stats !== undefined) {
          if (typeof validated.country_stats === "boolean") {
            searchParams.append("country_stats", validated.country_stats ? "10" : "0");
          } else {
            searchParams.append("country_stats", String(validated.country_stats));
          }
        }

        const queryString = searchParams.toString();
        const endpoint = `/accounts/${accountId}/stats${queryString ? `?${queryString}` : ""}`;

        const data = await apiClient.makeRequest(endpoint);

        logInfo("Alert statistics fetched successfully", {
          accountId,
          alertIds: validated.alerts,
          endpoint,
          from: validated.from,
          to: validated.to,
          partial: (data as { partial?: boolean })?.partial || false,
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
        logError("Failed to fetch alert statistics", error);
        throw error;
      }
    },
  };
}

export const fetchAlertStatsTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "fetch_alert_stats",
      description:
        "Retrieve comprehensive statistics for one or more alerts including mentions per interval, tones, influencers, geographical data, and reach metrics. Supports flexible date ranges, filtering, and aggregation options.",
      inputSchema: zodToJsonSchema(FetchAlertStatsArgsSchema),
    };
  },
  createHandler: createFetchAlertStatsHandler,
};
