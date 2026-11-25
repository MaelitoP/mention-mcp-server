import { z } from "zod";

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const AccountResponseSchema = z.object({
  account: z.object({
    id: z.string(),
    subscription: z.object({
      advanced_query_access: z.boolean(),
    }),
    groups: z.array(GroupSchema).optional(),
  }),
});

export const LanguageSchema = z.record(
  z.object({
    name: z.string(),
  })
);

export const SourceSchema = z.record(
  z.object({
    name: z.string(),
    hidden: z.boolean(),
  })
);

export const AppDataResponseSchema = z.object({
  alert_languages: LanguageSchema.optional(),
  alert_countries: z.record(z.string()).optional(),
  alert_sources: SourceSchema.optional(),
});

export const CreateAlertResponseSchema = z.object({
  alert: z.object({
    id: z.string(),
  }),
});

export const ListAlertsArgsSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum number of alerts to return (1-100)"),
  cursor: z.string().optional().describe("Pagination cursor for retrieving next page"),
});

export const GetAlertArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID to retrieve"),
});

export const CreateBasicAlertArgsSchema = z.object({
  group_id: z.string().describe("Group ID to which the alert should be associated"),
  name: z.string().min(1).max(255).describe("Alert name (required, 1-255 characters)"),
  description: z
    .string()
    .max(1000)
    .optional()
    .describe("Alert description (optional, max 1000 characters)"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe("Alert color code (e.g., '#05e363')"),
  included_keywords: z
    .array(z.string())
    .min(1)
    .describe("Keywords to include - at least one keyword that should be present in mentions"),
  required_keywords: z
    .array(z.string())
    .optional()
    .describe("Keywords that must be present in all mentions (optional)"),
  excluded_keywords: z
    .array(z.string())
    .optional()
    .describe("Keywords to exclude from mentions (optional)"),
  monitored_website: z
    .object({
      domain: z.string().describe("Domain to specifically monitor"),
      block_self: z.boolean().optional().describe("Whether to block mentions from own site"),
    })
    .optional()
    .describe("Specific website monitoring configuration (optional)"),
  languages: z
    .array(z.string())
    .max(5)
    .describe(
      "Language codes to monitor. Use get_app_data tool to see which language code are supported. Ask the user which language he would like to monitor. On advanced alert, it only applies to monitored pages and reviews pages. For keywords monitoring you should use the 'lang' operator in the query string."
    ),
  sources: z
    .array(z.string())
    .describe(
      "Sources to monitor. List availabled sources using get_app_data tool. Ask the user to know which source they want to monitor."
    ),

  blocked_sites: z
    .array(z.string())
    .optional()
    .describe("An array of blocked sites from which you don't want mentions to be tracked."),
});

export const CreateAdvancedAlertArgsSchema = z.object({
  group_id: z
    .string()
    .describe(
      "Group ID to which the alert should be associated. Ask user to which group he would like to create the alert on"
    ),
  name: z.string().min(1).max(255).describe("Alert name (required, 1-255 characters)"),
  description: z
    .string()
    .max(1000)
    .optional()
    .describe("Alert description (optional, max 1000 characters)"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe("Alert color (in hex color code format)"),
  query_string: z
    .string()
    .describe(
      "Advanced query string using boolean operators (e.g., '(NASA OR SpaceX) AND foo AND NOT baz')"
    ),
  languages: z
    .array(z.string())
    .max(5)
    .describe(
      "Language codes to monitor. Use get_app_data tool to see which language code are supported. Ask the user which language he would like to monitor. On advanced alert, it only applies to monitored pages and reviews pages. For keywords monitoring you should use the 'lang' selector in the query string."
    ),
  sources: z
    .array(z.string())
    .describe(
      "Sources to monitor. List availabled sources using get_app_data tool. Ask the user to know which source they want to monitor."
    ),
  blocked_sites: z
    .array(z.string())
    .optional()
    .describe("An array of blocked sites from which you don't want mentions to be tracked."),
});

export const UpdateAlertArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID to update"),
  name: z.string().min(1).max(255).optional().describe("New alert name (1-255 characters)"),
  description: z
    .string()
    .max(1000)
    .optional()
    .describe("New alert description (max 1000 characters)"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe("New alert color code"),
  included_keywords: z
    .array(z.string())
    .optional()
    .describe(
      "Keywords to include. Basic alerts only. Replaces the alert's list; leave out to keep it."
    ),
  required_keywords: z
    .array(z.string())
    .optional()
    .describe(
      "Required keywords. Basic alerts only. Replaces the alert's list; leave out to keep it, or send an empty list to clear it."
    ),
  excluded_keywords: z
    .array(z.string())
    .optional()
    .describe(
      "Excluded keywords. Basic alerts only. Replaces the alert's list; leave out to keep it."
    ),
  query_string: z
    .string()
    .optional()
    .describe(
      "Advanced query string. Advanced alerts only. Cannot be combined with included_keywords, required_keywords or excluded_keywords."
    ),
  languages: z.array(z.string()).max(5).optional().describe("Language codes to monitor (max 5)"),
  countries: z.array(z.string()).optional().describe("Country codes to monitor"),
  sources: z
    .array(z.string())
    .optional()
    .describe("Sources to monitor. List available sources using get_app_data tool."),
  blocked_sites: z.array(z.string()).optional().describe("Domains to exclude from monitoring"),
});

export const PauseAlertArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID to pause"),
});

export const UnpauseAlertArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID to unpause"),
});

export const BuildBooleanQueryPromptArgsSchema = z.object({
  instructions: z
    .string()
    .describe(
      "What the Boolean query should match, e.g., 'Mentions about NASA in English from the US or Canada'"
    ),
});

function mentionsDateTime(dayOffsetIfDateOnly: 0 | 1) {
  return z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/,
      "Expected a date (2026-11-01) or a date-time with Z or an offset (2026-11-01T08:00:00+01:00)"
    )
    .transform((value) =>
      value.length === 10
        ? new Date(Date.parse(value) + dayOffsetIfDateOnly * 86_400_000).toISOString()
        : value
    );
}

export const SearchMentionsArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID whose mentions to search"),
  from: mentionsDateTime(0)
    .optional()
    .describe(
      "First day to include (2026-11-01, from 00:00 UTC), or a date-time with Z or an offset (2026-11-01T08:00:00+01:00) at or after which mentions were published"
    ),
  to: mentionsDateTime(1)
    .optional()
    .describe(
      "Last day to include (2026-11-30, until 24:00 UTC), or a date-time with Z or an offset before which mentions were published"
    ),
  tone: z
    .array(z.number().int().min(-1).max(1))
    .optional()
    .describe(
      "Only mentions with one of these tones: -1 negative, 0 neutral, 1 positive. Cannot be combined with unread, favorite, q, tag, or folder spam or trash; with q or tag, add tone:negative, tone:neutral or tone:positive to q instead."
    ),
  source: z
    .string()
    .optional()
    .describe(
      "Only mentions from this source, e.g. 'twitter', 'news' or 'web'. Needs search access."
    ),
  countries: z
    .array(z.string().length(2))
    .optional()
    .describe("Only mentions from these countries (ISO 3166-1 alpha-2 codes)"),
  folder: z
    .enum(["inbox", "archive", "spam", "trash"])
    .optional()
    .describe(
      "Only mentions in this folder. spam and trash cannot be combined with favorite or tone."
    ),
  unread: z
    .boolean()
    .optional()
    .describe(
      "true returns only unread mentions. Cannot be combined with favorite, q, tag or tone."
    ),
  favorite: z
    .boolean()
    .optional()
    .describe(
      "true returns only favorite mentions. Cannot be combined with unread, tone, or folder spam or trash."
    ),
  q: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Search query, e.g. 'tone:(neutral OR positive) language:en' or 'published_at:[2026-11-01 TO 2026-11-30]'. Needs search access. Cannot be combined with unread or tone."
    ),
  tag: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Only mentions with this tag, by the name listed in a mention's tags. Needs search access. Cannot be combined with unread or tone."
    ),
  sort: z
    .enum([
      "published_at",
      "author_influence.score",
      "direct_reach",
      "cumulative_reach",
      "domain_reach",
    ])
    .optional()
    .describe(
      "Order of the mentions. published_at, the default, lists the newest first; the others list the highest first and page through the first 1000 mentions only. Needs search access."
    ),
  limit: z.number().int().min(1).max(100).default(20).describe("Mentions per page, 1-100"),
  next_page: z
    .string()
    .optional()
    .describe(
      "The next_page token of a previous result, to get the following page. Pass it with the same alert_id and no parameter other than limit: the token keeps the others."
    ),
});

export const MentionsResponseSchema = z.object({
  mentions: z.array(
    z.object({
      id: z.string(),
      published_at: z.string().nullish(),
      source_type: z.string().nullish(),
      title: z.string().nullish(),
      description: z.string().nullish(),
      original_url: z.string().nullish(),
      tone: z.number().nullish(),
      direct_reach: z.number().nullish(),
      domain_reach: z.number().nullish(),
      author_influence: z.object({ name: z.string().nullish() }).nullish(),
      country: z.string().nullish(),
      tags: z.array(z.object({ name: z.string() })).nullish(),
      children: z.object({ total: z.number() }).nullish(),
    })
  ),
  search_access_denied: z.boolean().nullish(),
  _links: z.object({ more: z.object({ href: z.string() }).nullish() }).nullish(),
});

// The stats endpoint rejects a Z, an offset, or a date-time without fractional seconds.
function statsDateTime(timeIfDateOnly: "00:00:00" | "23:59:59") {
  return z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/,
      "Expected a date (2026-11-01) or a date-time (2026-11-01T08:00:00), optionally ending in Z"
    )
    .transform((value) => `${value.slice(0, 10)}T${value.slice(11, 19) || timeIfDateOnly}.0`);
}

export const FetchAlertStatsArgsSchema = z.object({
  alerts: z
    .array(z.string())
    .min(1)
    .describe("One or more alert IDs to fetch statistics for (required)"),
  from: statsDateTime("00:00:00").describe(
    "First day to include, in timezone, e.g. 2026-11-01. Any time of day, fractional seconds or trailing Z is ignored."
  ),
  to: statsDateTime("23:59:59").describe(
    "Last day to include, in timezone, e.g. 2026-11-30 to end on 30 November, not 2026-12-01. Any time of day, fractional seconds or trailing Z is ignored."
  ),
  timezone: z
    .string()
    .optional()
    .describe(
      "Timezone in which from and to are read and buckets start, e.g. 'Europe/Berlin'. Defaults to UTC."
    ),
  interval: z
    .enum(["P1D", "P1W", "P1M"])
    .describe(
      "Bucket size: P1D (day), P1W (week, Monday to Sunday) or P1M (month). P1W and P1M widen the range to whole weeks or whole months."
    ),
  favorite: z.boolean().optional().describe("Only include statistics based on favorite mentions"),
  tones: z
    .array(z.number().int().min(-1).max(1))
    .optional()
    .describe("Filter stats by tone: -1 (negative), 0 (neutral), 1 (positive)"),
  languages: z.array(z.string()).optional().describe("Filter stats by language codes"),
  sources: z
    .array(z.string())
    .optional()
    .describe("Filter stats by source types (e.g., 'twitter', 'web', 'news')"),
  countries: z
    .array(z.string().length(2))
    .optional()
    .describe("Filter stats by country ISO codes (2-letter format)"),
  tags: z.array(z.string()).optional().describe("Filter stats by specific tags"),
  week_day_stats: z
    .boolean()
    .optional()
    .describe("Group stats by week day (cannot be combined with week_day_by_hour_stats)"),
  week_day_by_hour_stats: z
    .boolean()
    .optional()
    .describe("Group stats by hour per weekday (cannot be combined with week_day_stats)"),
  country_stats: z
    .union([z.boolean(), z.number().int().min(0).max(100)])
    .optional()
    .describe("Return top N countries"),
  influencers: z.boolean().optional().describe("Include top 10 influencers per alert"),
  reach_per_interval_stats: z
    .boolean()
    .optional()
    .describe("Include direct, cumulative, and domain reach per interval"),
  "author_influence.score": z
    .string()
    .regex(/^(\d+)?:(\d+)?$/)
    .optional()
    .describe(
      "Filter by author influence score range. Format: 'min:max' (e.g., '50:100', ':90', '30:')"
    ),
});

export type AccountResponse = z.infer<typeof AccountResponseSchema>;
export type AppDataResponse = z.infer<typeof AppDataResponseSchema>;
export type ListAlertsArgs = z.infer<typeof ListAlertsArgsSchema>;
export type GetAlertArgs = z.infer<typeof GetAlertArgsSchema>;
export type CreateBasicAlertArgs = z.infer<typeof CreateBasicAlertArgsSchema>;
export type CreateAdvancedAlertArgs = z.infer<typeof CreateAdvancedAlertArgsSchema>;
export type UpdateAlertArgs = z.infer<typeof UpdateAlertArgsSchema>;
export type PauseAlertArgs = z.infer<typeof PauseAlertArgsSchema>;
export type UnpauseAlertArgs = z.infer<typeof UnpauseAlertArgsSchema>;
export type BuildBooleanQueryPromptArgs = z.infer<typeof BuildBooleanQueryPromptArgsSchema>;
export type SearchMentionsArgs = z.infer<typeof SearchMentionsArgsSchema>;
export type MentionsResponse = z.infer<typeof MentionsResponseSchema>;
export type FetchAlertStatsArgs = z.infer<typeof FetchAlertStatsArgsSchema>;
