import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type MentionAPIClient, apiPath } from "../api-client.js";
import { logInfo } from "../logger.js";
import {
  type MentionsResponse,
  MentionsResponseSchema,
  type SearchMentionsArgs,
  SearchMentionsArgsSchema,
} from "../types.js";

const MAX_API_LIMIT = 1000;

type Filters = Omit<SearchMentionsArgs, "alert_id" | "limit" | "next_page">;

const PageSchema = z.object({
  query: z.string(),
  offset: z.number().int().min(0).optional(),
});

type Page = z.infer<typeof PageSchema>;

const exclusiveFilters = [
  ["unread", "favorite"],
  ["unread", "q"],
  ["unread", "tag"],
  ["unread", "tone"],
  ["favorite", "tone"],
  ["favorite", "folder"],
  ["tone", "folder"],
  ["tone", "q"],
  ["tone", "tag"],
] as const;

// Not a .refine: McpServer lists a zod v3 ZodEffects input schema as an object without properties.
function rejectExclusiveFilters(filters: Filters) {
  const set = {
    unread: filters.unread === true,
    favorite: filters.favorite === true,
    tone: filters.tone !== undefined,
    q: filters.q !== undefined,
    tag: filters.tag !== undefined,
    folder: filters.folder === "spam" || filters.folder === "trash",
  };
  for (const [first, second] of exclusiveFilters) {
    if (set[first] && set[second]) {
      const named = second === "folder" ? `folder ${filters.folder}` : second;
      throw new Error(`${first} cannot be combined with ${named}`);
    }
  }
}

function firstPage(filters: Filters): Page {
  // In every order but published_at, the API's _links.more does not lead to the next page, so pages
  // are offsets into one query whose before_date is fixed, keeping later mentions from shifting them.
  const byDate = filters.sort === undefined || filters.sort === "published_at";
  const query = new URLSearchParams();
  const pinEnd = filters.from !== undefined || !byDate;
  const beforeDate = filters.to ?? (pinEnd ? new Date().toISOString() : undefined);
  if (beforeDate !== undefined) query.set("before_date", beforeDate);
  if (filters.from !== undefined) query.set("not_before_date", filters.from);
  for (const tone of filters.tone ?? []) query.append("tone[]", String(tone));
  if (filters.source !== undefined) query.set("source", filters.source);
  for (const country of filters.countries ?? []) query.append("countries[]", country);
  if (filters.folder !== undefined) query.set("folder", filters.folder);
  if (filters.unread === true) query.set("unread", "true");
  if (filters.favorite === true) query.set("favorite", "true");
  let q = filters.q;
  if (filters.tag !== undefined) {
    const tagQuery = `tags:${JSON.stringify(filters.tag)}`;
    q = q === undefined ? tagQuery : `(${q}) AND ${tagQuery}`;
  }
  if (q !== undefined) query.set("q", q);
  if (filters.sort !== undefined) query.set("sort", filters.sort);
  return { query: query.toString(), offset: byDate ? undefined : 0 };
}

function decodePage(token: string): Page {
  try {
    return PageSchema.parse(JSON.parse(Buffer.from(token, "base64url").toString()));
  } catch {
    throw new Error("next_page is not a token returned by search_mentions");
  }
}

function encodePage(page: Page): string {
  return Buffer.from(JSON.stringify(page)).toString("base64url");
}

function compactMention(mention: MentionsResponse["mentions"][number]) {
  return {
    id: mention.id,
    published_at: mention.published_at || undefined,
    source: mention.source_type || undefined,
    title: mention.title || undefined,
    text: mention.description || undefined,
    url: mention.original_url || undefined,
    tone: mention.tone ?? undefined,
    reach: mention.direct_reach ?? mention.domain_reach ?? undefined,
    author: mention.author_influence?.name || undefined,
    country: mention.country || undefined,
    tags: mention.tags?.length ? mention.tags.map((tag) => tag.name) : undefined,
    children: mention.children?.total || undefined,
  };
}

export function registerSearchMentionsTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "search_mentions",
    {
      title: "Search Mentions",
      description:
        "Search an alert's mentions, newest first by default. Each mention has id, published_at, source, title, text, url, tone (-1 negative, 0 neutral, 1 positive), reach (direct reach of a social post, domain reach of a website), author, country, tags and children (number of related mentions, such as retweets); a field that is missing, empty or zero is left out. When more mentions match, the result has a next_page token that returns the following page.",
      inputSchema: SearchMentionsArgsSchema.shape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ alert_id, limit, next_page, ...filters }) => {
      let page: Page;
      if (next_page === undefined) {
        rejectExclusiveFilters(filters);
        page = firstPage(filters);
      } else {
        const other = Object.entries(filters).find(([, value]) => value !== undefined);
        if (other) {
          throw new Error(`next_page cannot be combined with ${other[0]}`);
        }
        page = decodePage(next_page);
      }

      const accountId = await apiClient.getAccountId();

      // The API has no offset parameter: fetch the first offset + limit mentions and drop the first offset.
      const apiLimit =
        page.offset === undefined ? limit : Math.min(page.offset + limit, MAX_API_LIMIT);
      const query = new URLSearchParams(page.query);
      query.set("limit", String(apiLimit));
      const path = apiPath`/accounts/${accountId}/alerts/${alert_id}/mentions`;
      const data = MentionsResponseSchema.parse(await apiClient.makeRequest(`${path}?${query}`));
      const mentions = data.mentions.slice(page.offset ?? 0);

      const notes: string[] = [];
      let nextPage: Page | undefined;
      if (page.offset === undefined) {
        const more = data._links?.more?.href;
        if (more) {
          nextPage = { query: new URL(more, "http://localhost").searchParams.toString() };
        }
      } else if (data.mentions.length === apiLimit) {
        if (page.offset + limit < MAX_API_LIMIT) {
          nextPage = { query: page.query, offset: page.offset + limit };
        } else {
          notes.push(
            `This order pages through the first ${MAX_API_LIMIT} mentions only; narrow the search with from and to to reach the others.`
          );
        }
      }

      if (data.search_access_denied) {
        notes.push(
          "The Mention API returned no mentions because the account's plan has no search access, which sort, source, q and tag need."
        );
      }
      const withoutText = mentions.filter((mention) => !mention.title && !mention.description);
      if (withoutText.length > 0) {
        const sources = new Set(withoutText.flatMap((mention) => mention.source_type || []));
        notes.push(
          `The Mention API does not provide the title or text of ${withoutText.length} of these mentions (${[...sources].join(", ")}).`
        );
      }

      logInfo("Mentions searched", { accountId, alertId: alert_id, count: mentions.length });

      const result = {
        mentions: mentions.map(compactMention),
        next_page: nextPage && encodePage(nextPage),
      };
      return {
        content: [
          ...(notes.length > 0 ? [{ type: "text" as const, text: notes.join(" ") }] : []),
          { type: "text" as const, text: JSON.stringify(result) },
        ],
      };
    }
  );
}
