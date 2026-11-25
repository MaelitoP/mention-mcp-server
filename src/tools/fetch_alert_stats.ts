import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "../api-client.js";
import { logInfo } from "../logger.js";
import { FetchAlertStatsArgsSchema } from "../types.js";

export function registerFetchAlertStatsTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "fetch_alert_stats",
    {
      title: "Fetch Alert Stats",
      description:
        "Retrieve comprehensive statistics for one or more alerts including mentions per interval, tones, influencers, geographical data, and reach metrics. Supports flexible date ranges, filtering, and aggregation options.",
      inputSchema: FetchAlertStatsArgsSchema.shape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => {
      const accountId = await apiClient.getAccountId();

      const searchParams = new URLSearchParams();

      for (const alertId of args.alerts) {
        searchParams.append("alerts[]", alertId);
      }
      searchParams.append("from", args.from);
      searchParams.append("to", args.to);
      searchParams.append("interval", args.interval);

      const optionalParams = {
        timezone: args.timezone,
        favorite: args.favorite,
        week_day_stats: args.week_day_stats,
        week_day_by_hour_stats: args.week_day_by_hour_stats,
        influencers: args.influencers,
        reach_per_interval_stats: args.reach_per_interval_stats,
        "author_influence.score": args["author_influence.score"],
      };

      for (const [key, value] of Object.entries(optionalParams)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }

      const arrayParams = {
        "tones[]": args.tones,
        "languages[]": args.languages,
        "sources[]": args.sources,
        "countries[]": args.countries,
        "tags[]": args.tags,
      };

      for (const [key, values] of Object.entries(arrayParams)) {
        if (values && Array.isArray(values)) {
          for (const value of values) {
            searchParams.append(key, String(value));
          }
        }
      }

      if (args.country_stats !== undefined) {
        if (typeof args.country_stats === "boolean") {
          searchParams.append("country_stats", args.country_stats ? "10" : "0");
        } else {
          searchParams.append("country_stats", String(args.country_stats));
        }
      }

      const queryString = searchParams.toString();
      const endpoint = `/accounts/${accountId}/stats${queryString ? `?${queryString}` : ""}`;

      const data = await apiClient.makeRequest(endpoint);

      logInfo("Alert statistics fetched successfully", {
        accountId,
        alertIds: args.alerts,
        endpoint,
        from: args.from,
        to: args.to,
        partial: (data as { partial?: boolean })?.partial || false,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
