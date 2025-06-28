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
  noise_detection: z.boolean().default(false).optional(),
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
  noise_detection: z.boolean().default(false).optional(),
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
  query_type: z.enum(["basic", "advanced"]).optional().describe("Type of query to update"),
  included_keywords: z
    .array(z.string())
    .optional()
    .describe("Keywords to include (for basic queries)"),
  required_keywords: z
    .array(z.string())
    .optional()
    .describe("Required keywords (for basic queries)"),
  excluded_keywords: z
    .array(z.string())
    .optional()
    .describe("Excluded keywords (for basic queries)"),
  query_string: z.string().optional().describe("Advanced query string (for advanced queries)"),
  languages: z.array(z.string()).max(5).optional().describe("Language codes to monitor (max 5)"),
  countries: z.array(z.string()).optional().describe("Country codes to monitor"),
  sources: z
    .array(z.enum(["twitter", "news", "web", "blogs", "videos", "forums", "images", "facebook"]))
    .optional()
    .describe("Sources to monitor"),
  blocked_sites: z.array(z.string()).optional().describe("Domains to exclude from monitoring"),
  noise_detection: z.boolean().optional().describe("Enable noise detection"),
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

export const FetchMentionsArgsSchema = z.object({
  alert_id: z.string().describe("The alert ID to fetch mentions from"),
  since_id: z
    .number()
    .optional()
    .describe(
      "Return mentions with ID greater than this value. Cannot be used with before_date, not_before_date, or cursor."
    ),
  before_date: z
    .string()
    .optional()
    .describe("Return mentions published before this datetime (ISO8601 format)"),
  not_before_date: z
    .string()
    .optional()
    .describe(
      "Ignore mentions older than this date (ISO8601 format). Must be used with before_date."
    ),
  limit: z
    .number()
    .min(1)
    .max(1000)
    .default(20)
    .optional()
    .describe("Number of mentions to return. Default is 20, max is 1000."),
  source: z
    .string()
    .optional()
    .describe("Filter by source"),
  unread: z
    .boolean()
    .optional()
    .describe("Return only unread mentions. Cannot be used with favorite, q, or tone."),
  favorite: z
    .boolean()
    .optional()
    .describe(
      "Return only favorite mentions. Cannot be used with folder unless it is 'inbox' or 'archive'."
    ),
  folder: z
    .enum(["inbox", "archive", "spam", "trash"])
    .optional()
    .describe("Filter by folder: inbox, archive, spam, trash"),
  tone: z
    .array(z.number().int().min(-1).max(1))
    .optional()
    .describe("Filter by tone: -1 = negative, 0 = neutral, 1 = positive. Multiple values allowed."),
  countries: z
    .array(z.string().length(2))
    .optional()
    .describe("Filter by country codes (ISO 3166-1 alpha-2). Multiple values allowed."),
  include_children: z.boolean().optional().describe("Whether to include child mentions"),
  sort: z
    .enum([
      "published_at",
      "author_influence.score",
      "direct_reach",
      "cumulative_reach",
      "domain_reach",
    ])
    .optional()
    .describe("Sort by field"),
  languages: z
    .array(z.string())
    .optional()
    .describe("Filter by language codes. Multiple values allowed."),
  timezone: z.string().optional().describe("Timezone for parsing date values in q parameter"),
  q: z.string().optional().describe("Advanced keyword-based filtering"),
  cursor: z.string().optional().describe("Pagination cursor for navigating results"),
});

export interface MentionAPIError {
  error: {
    code: number;
    message: string;
    details?: string;
  };
}

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
export type FetchMentionsArgs = z.infer<typeof FetchMentionsArgsSchema>;
