import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { type Mock, afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { MentionAPIClient } from "../api-client.js";
import { createServer } from "../server.js";

vi.mock("../logger.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logDebug: vi.fn(),
}));

async function connect(apiClient: MentionAPIClient, { readOnly = false } = {}) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await Promise.all([
    createServer(apiClient, "1.0.0", { readOnly }).connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

function textResult(text: string) {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string | RegExp) {
  return {
    content: [
      { type: "text", text: typeof text === "string" ? text : expect.stringMatching(text) },
    ],
    isError: true,
  };
}

describe("MCP server", () => {
  let client: Client;
  let mockApiClient: {
    getAccountInfo: Mock<MentionAPIClient["getAccountInfo"]>;
    getAccountId: Mock<MentionAPIClient["getAccountId"]>;
    makeRequest: Mock<MentionAPIClient["makeRequest"]>;
  };

  const callTool = (name: string, args: Record<string, unknown>) =>
    client.callTool({ name, arguments: args });

  beforeEach(async () => {
    mockApiClient = {
      getAccountInfo: vi.fn(),
      getAccountId: vi.fn(async () => "test-account"),
      makeRequest: vi.fn(),
    };
    client = await connect(mockApiClient as unknown as MentionAPIClient);
  });

  afterEach(async () => {
    await client.close();
    vi.unstubAllGlobals();
  });

  it("should advertise tools and prompts but not resources", () => {
    const capabilities = client.getServerCapabilities();

    expect(capabilities).toHaveProperty("tools");
    expect(capabilities).toHaveProperty("prompts");
    expect(capabilities).not.toHaveProperty("resources");
  });

  it("should return server instructions at initialisation", () => {
    expect(client.getInstructions()).toContain("Call get_account_info first.");
  });

  describe("tools/list", () => {
    it("should list all tools", async () => {
      const { tools } = await client.listTools();

      expect(tools.map((t) => t.name)).toEqual([
        "get_account_info",
        "get_app_data",
        "list_alerts",
        "get_alert",
        "create_basic_alert",
        "create_advanced_alert",
        "update_alert",
        "pause_alert",
        "unpause_alert",
        "search_mentions",
        "fetch_alert_stats",
      ]);
    });

    it("should give every tool a title and annotations", async () => {
      const { tools } = await client.listTools();
      const read = { readOnlyHint: true, openWorldHint: true };
      const write = (destructiveHint: boolean, idempotentHint: boolean) => ({
        readOnlyHint: false,
        destructiveHint,
        idempotentHint,
        openWorldHint: true,
      });

      expect(Object.fromEntries(tools.map((t) => [t.name, [t.title, t.annotations]]))).toEqual({
        get_account_info: ["Get Account Info", read],
        get_app_data: ["Get Languages, Countries and Sources", read],
        list_alerts: ["List Alerts", read],
        get_alert: ["Get Alert", read],
        create_basic_alert: ["Create Basic Alert", write(false, false)],
        create_advanced_alert: ["Create Advanced Alert", write(false, false)],
        update_alert: ["Update Alert", write(true, true)],
        pause_alert: ["Pause Alert", write(false, true)],
        unpause_alert: ["Unpause Alert", write(false, true)],
        search_mentions: ["Search Mentions", read],
        fetch_alert_stats: ["Fetch Alert Stats", read],
      });
    });

    it("should list the search_mentions parameters with limit defaulting to 20", async () => {
      const { tools } = await client.listTools();
      const searchMentions = tools.find((t) => t.name === "search_mentions");

      expect(Object.keys(searchMentions?.inputSchema.properties ?? {})).toEqual([
        "alert_id",
        "from",
        "to",
        "tone",
        "source",
        "countries",
        "folder",
        "unread",
        "favorite",
        "q",
        "tag",
        "sort",
        "limit",
        "next_page",
      ]);
      expect(searchMentions?.inputSchema).toHaveProperty("required", ["alert_id"]);
      expect(searchMentions?.inputSchema).toHaveProperty(
        "properties.limit",
        expect.objectContaining({ default: 20, maximum: 100 })
      );
    });

    it("should not expose noise_detection on any tool", async () => {
      const { tools } = await client.listTools();

      for (const tool of tools) {
        expect(tool.inputSchema).not.toHaveProperty("properties.noise_detection");
      }
    });

    it("should require from, to and interval on fetch_alert_stats and not expose important", async () => {
      const { tools } = await client.listTools();
      const fetchAlertStats = tools.find((t) => t.name === "fetch_alert_stats");

      expect(fetchAlertStats?.inputSchema).toHaveProperty(
        "required",
        expect.arrayContaining(["from", "to", "interval"])
      );
      expect(fetchAlertStats?.inputSchema).toHaveProperty("properties.to.pattern");
      expect(fetchAlertStats?.inputSchema).not.toHaveProperty("properties.important");
    });

    it("should list both query field kinds on update_alert", async () => {
      const { tools } = await client.listTools();
      const updateAlert = tools.find((t) => t.name === "update_alert");

      expect(updateAlert?.inputSchema).toHaveProperty("properties.query_string");
      expect(updateAlert?.inputSchema).toHaveProperty("properties.included_keywords");
      expect(updateAlert?.inputSchema).toHaveProperty("required", ["alert_id"]);
    });
  });

  describe("read-only mode", () => {
    async function connectReadOnly() {
      const readOnlyClient = await connect(mockApiClient as unknown as MentionAPIClient, {
        readOnly: true,
      });
      onTestFinished(() => readOnlyClient.close());
      return readOnlyClient;
    }

    it("should list only the tools annotated readOnlyHint", async () => {
      const readOnlyClient = await connectReadOnly();
      const { tools: allTools } = await client.listTools();
      const { tools } = await readOnlyClient.listTools();

      expect(tools).toEqual(allTools.filter((t) => t.annotations?.readOnlyHint === true));
    });

    it("should not mention unregistered tools in the instructions", async () => {
      const readOnlyClient = await connectReadOnly();
      const { tools: allTools } = await client.listTools();
      const { tools } = await readOnlyClient.listTools();
      const registered = new Set(tools.map((t) => t.name));
      const instructions = readOnlyClient.getInstructions();

      expect(instructions).toContain("list_alerts");
      for (const { name } of allTools.filter((t) => !registered.has(t.name))) {
        expect(instructions).not.toContain(name);
      }
    });
  });

  describe("tool errors", () => {
    it("should return a missing required argument as an error result", async () => {
      const result = await callTool("get_alert", {});

      expect(result).toEqual(
        errorResult(/Invalid arguments for tool get_alert: Required at alert_id/)
      );
      expect(mockApiClient.makeRequest).not.toHaveBeenCalled();
    });

    it("should return an API 4xx as an error result", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            Response.json({ error: { code: 400, message: "Invalid alert" } }, { status: 400 })
          )
      );
      const apiClient = new MentionAPIClient(
        {
          apiKey: "test-api-key",
          apiBaseUrl: "https://api.test.com",
          logLevel: "info",
          requestTimeout: 5000,
          readOnly: false,
        },
        "1.0.0"
      );
      const realClient = await connect(apiClient);
      onTestFinished(() => realClient.close());

      const result = await realClient.callTool({ name: "get_account_info", arguments: {} });

      expect(result).toEqual(errorResult(/Mention API Error \(HTTP 400\): Invalid alert$/));
    });

    it("should return an unknown tool as an error result", async () => {
      expect(await callTool("unknown_tool", {})).toEqual(
        errorResult(/Tool unknown_tool not found/)
      );
    });
  });

  describe("get_account_info", () => {
    it("should return formatted account info", async () => {
      mockApiClient.getAccountInfo.mockResolvedValue({
        account: {
          id: "test-account",
          subscription: { advanced_query_access: true },
          groups: [{ id: "group1", name: "Test Group" }],
        },
      });

      const result = await callTool("get_account_info", {});

      expect(result).toEqual(
        textResult(
          JSON.stringify(
            {
              accountId: "test-account",
              canCreateAdvancedAlert: true,
              groups: [{ id: "group1", name: "Test Group" }],
            },
            null,
            2
          )
        )
      );
    });

    it("should handle missing groups", async () => {
      mockApiClient.getAccountInfo.mockResolvedValue({
        account: {
          id: "test-account",
          subscription: { advanced_query_access: false },
        },
      });

      const result = await callTool("get_account_info", {});

      expect(result).toEqual(
        textResult(
          JSON.stringify(
            { accountId: "test-account", canCreateAdvancedAlert: false, groups: [] },
            null,
            2
          )
        )
      );
    });
  });

  describe("get_app_data", () => {
    it("should return language and country codes and the visible sources", async () => {
      mockApiClient.makeRequest.mockResolvedValue({
        alert_languages: { en: { name: "English" } },
        alert_countries: { FR: "France" },
        alert_sources: {
          web: { name: "Web", hidden: false },
          secret: { name: "Secret", hidden: true },
        },
      });

      const result = await callTool("get_app_data", {});

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith("/app/data");
      expect(result).toEqual(
        textResult(
          JSON.stringify({ languages: ["en"], countries: ["FR"], sources: ["web"] }, null, 2)
        )
      );
    });
  });

  describe("list_alerts", () => {
    it("should list alerts with pagination", async () => {
      const mockAlertsData = {
        alerts: [{ id: "alert1", name: "Test Alert" }],
        pagination: { cursor: "next-page" },
      };
      mockApiClient.makeRequest.mockResolvedValue(mockAlertsData);

      const result = await callTool("list_alerts", { limit: 10, cursor: "page1" });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        "/accounts/test-account/alerts?limit=10&cursor=page1"
      );
      expect(result).toEqual(textResult(JSON.stringify(mockAlertsData, null, 2)));
    });

    it("should handle no pagination parameters", async () => {
      mockApiClient.makeRequest.mockResolvedValue({ alerts: [] });

      await callTool("list_alerts", {});

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith("/accounts/test-account/alerts");
    });
  });

  describe("create_basic_alert", () => {
    it("should create basic alert", async () => {
      mockApiClient.makeRequest.mockResolvedValue({ alert: { id: "new-alert" } });

      const result = await callTool("create_basic_alert", {
        group_id: "group-123",
        name: "Test Alert",
        included_keywords: ["test"],
        excluded_keywords: ["spam"],
        languages: ["en"],
        sources: ["web"],
      });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith("/accounts/test-account/alerts", {
        method: "POST",
        body: JSON.stringify({
          group_id: "group-123",
          name: "Test Alert",
          languages: ["en"],
          sources: ["web"],
          query: {
            type: "basic",
            included_keywords: ["test"],
            required_keywords: undefined,
            excluded_keywords: ["spam"],
            monitored_website: undefined,
          },
        }),
      });
      expect(result).toEqual(textResult("new-alert"));
    });
  });

  describe("create_advanced_alert", () => {
    it("should create advanced alert", async () => {
      mockApiClient.makeRequest.mockResolvedValue({ alert: { id: "new-alert" } });

      const result = await callTool("create_advanced_alert", {
        group_id: "group-123",
        name: "Advanced Alert",
        query_string: "(NASA OR SpaceX) AND mars",
        languages: ["en"],
        sources: ["web"],
      });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith("/accounts/test-account/alerts", {
        method: "POST",
        body: JSON.stringify({
          group_id: "group-123",
          name: "Advanced Alert",
          languages: ["en"],
          sources: ["web"],
          query: {
            type: "advanced",
            query_string: "(NASA OR SpaceX) AND mars",
          },
        }),
      });
      expect(result).toEqual(textResult("new-alert"));
    });
  });

  describe("update_alert", () => {
    it.each([
      { field: "included_keywords", value: ["nasa"], type: "basic" },
      { field: "required_keywords", value: ["mars"], type: "basic" },
      { field: "excluded_keywords", value: ["spam"], type: "basic" },
      { field: "query_string", value: "nasa AND mars", type: "advanced" },
    ])("should send a $type query when only $field is passed", async ({ field, value, type }) => {
      mockApiClient.makeRequest.mockResolvedValue({});

      await callTool("update_alert", { alert_id: "alert-123", [field]: value });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        "/accounts/test-account/alerts/alert-123",
        { method: "PUT", body: JSON.stringify({ query: { type, [field]: value } }) }
      );
    });

    it("should send no query when no query field is passed", async () => {
      const updated = { alert: { id: "alert-123", name: "Renamed" } };
      mockApiClient.makeRequest.mockResolvedValue(updated);

      const result = await callTool("update_alert", { alert_id: "alert-123", name: "Renamed" });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        "/accounts/test-account/alerts/alert-123",
        { method: "PUT", body: JSON.stringify({ name: "Renamed" }) }
      );
      expect(result).toEqual(textResult(JSON.stringify(updated, null, 2)));
    });

    it.each(["included_keywords", "required_keywords", "excluded_keywords"])(
      "should reject query_string combined with %s",
      async (field) => {
        const result = await callTool("update_alert", {
          alert_id: "alert-123",
          query_string: "nasa AND mars",
          [field]: ["nasa"],
        });

        expect(result).toEqual(
          errorResult(
            "query_string cannot be combined with included_keywords, required_keywords or excluded_keywords"
          )
        );
        expect(mockApiClient.getAccountId).not.toHaveBeenCalled();
      }
    );
  });

  describe("search_mentions", () => {
    const articleMention = {
      id: "5001",
      alert_id: 101,
      title: "Example Corp opens a new office",
      description: "Example Corp announced on Monday that it opens a new office in Lyon.",
      description_short: "Example Corp opens a new office",
      original_url: "https://news.example.com/example-corp-office",
      clickable_url: "https://news.example.com/example-corp-office",
      published_at: "2026-11-24T09:00:00.0+00:00",
      country: "FR",
      folder: "inbox",
      read: false,
      tone: 1,
      source_type: "news",
      source_name: "Example News",
      language_code: "fr",
      domain_reach: 120000,
      author_influence: { id: "a1", kind: "web", name: "Example Author", score: 60 },
      tags: [{ id: "t1", name: "expansion", mention_count: 3, keywords: [] }],
      children: { children: [], total: 2 },
      offsets: { title: [0, 12] },
    };
    const tweetMention = {
      id: "5002",
      alert_id: 101,
      published_at: "2026-11-24T08:00:00.0+00:00",
      country: "US",
      folder: "inbox",
      read: true,
      tone: 0,
      source_type: "twitter",
      language_code: "en",
      direct_reach: 1500,
      cumulative_reach: 4200,
      tags: [],
      children: { children: [], total: 0 },
      metadata: { twitter: { id_str: "1234567890", user: { id_str: "42" } } },
    };
    const forumMention = {
      id: "5003",
      published_at: "2026-11-24T07:00:00.0+00:00",
      source_type: "forums",
      title: "Example Corp office thread",
      tone: 0,
      domain_reach: 800,
      tags: [],
      children: { children: [], total: 0 },
    };
    const secondTweetMention = {
      ...tweetMention,
      id: "5004",
      published_at: "2026-11-24T06:00:00.0+00:00",
      tone: -1,
      direct_reach: 30,
    };

    const pageOf = (result: Awaited<ReturnType<typeof callTool>>) =>
      JSON.parse((result.content as { text: string }[]).at(-1)?.text ?? "") as {
        mentions: { id: string }[];
        next_page?: string;
      };

    async function followPages(first: { alert_id: string; limit: number; sort?: string }) {
      const results = [];
      let args: Record<string, unknown> = first;
      for (let call = 0; call < 20; call++) {
        const result = await callTool("search_mentions", args);
        results.push(result);
        const { next_page } = pageOf(result);
        if (next_page === undefined) {
          return results;
        }
        args = { alert_id: first.alert_id, limit: first.limit, next_page };
      }
      throw new Error("next_page never ran out");
    }

    function fakeMentions(count: number) {
      return Array.from({ length: count }, (_, i) => ({
        id: `m${i}`,
        published_at: `2026-11-${20 - i}T00:00:00.0+00:00`,
        source_type: "web",
        title: `Title ${i}`,
        description: `Text ${i}`,
        direct_reach: (i * 3) % count,
      }));
    }

    function fakeMentionsApi(all: ReturnType<typeof fakeMentions>) {
      return (endpoint: string) => {
        const query = new URL(endpoint, "http://localhost").searchParams;
        const sort = query.get("sort");
        const limit = Number(query.get("limit"));
        const beforeDate = query.get("before_date");
        const sorted =
          sort === null || sort === "published_at"
            ? all
            : [...all].sort((a, b) => b.direct_reach - a.direct_reach);
        const mentions = sorted
          .filter((mention) => beforeDate === null || mention.published_at < beforeDate)
          .slice(0, limit);
        const more = new URLSearchParams({ limit: String(limit) });
        more.set("before_date", mentions.at(-1)?.published_at ?? "");
        if (sort !== null) more.set("sort", sort);
        return {
          mentions,
          _links:
            mentions.length === limit
              ? { more: { href: `/api/accounts/test-account/alerts/alert-1/mentions?${more}` } }
              : {},
        };
      };
    }

    it("should return compact mentions and say which have no text", async () => {
      mockApiClient.makeRequest.mockResolvedValue({
        mentions: [articleMention, tweetMention, forumMention, secondTweetMention],
      });

      const result = await callTool("search_mentions", { alert_id: "alert-1" });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "The Mention API does not provide the title or text of 2 of these mentions (twitter).",
          },
          {
            type: "text",
            text: JSON.stringify({
              mentions: [
                {
                  id: "5001",
                  published_at: "2026-11-24T09:00:00.0+00:00",
                  source: "news",
                  title: "Example Corp opens a new office",
                  text: "Example Corp announced on Monday that it opens a new office in Lyon.",
                  url: "https://news.example.com/example-corp-office",
                  tone: 1,
                  reach: 120000,
                  author: "Example Author",
                  country: "FR",
                  tags: ["expansion"],
                  children: 2,
                },
                {
                  id: "5002",
                  published_at: "2026-11-24T08:00:00.0+00:00",
                  source: "twitter",
                  tone: 0,
                  reach: 1500,
                  country: "US",
                },
                {
                  id: "5003",
                  published_at: "2026-11-24T07:00:00.0+00:00",
                  source: "forums",
                  title: "Example Corp office thread",
                  tone: 0,
                  reach: 800,
                },
                {
                  id: "5004",
                  published_at: "2026-11-24T06:00:00.0+00:00",
                  source: "twitter",
                  tone: -1,
                  reach: 30,
                  country: "US",
                },
              ],
            }),
          },
        ],
      });
    });

    it("should say when the plan has no search access", async () => {
      mockApiClient.makeRequest.mockResolvedValue({ mentions: [], search_access_denied: true });

      const result = await callTool("search_mentions", {
        alert_id: "alert-1",
        sort: "direct_reach",
      });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "The Mention API returned no mentions because the account's plan has no search access, which sort, source, q and tag need.",
          },
          { type: "text", text: JSON.stringify({ mentions: [] }) },
        ],
      });
    });

    it.each([
      { args: {}, query: [["limit", "20"]] },
      { args: { unread: false, favorite: false }, query: [["limit", "20"]] },
      {
        args: { tone: [-1, 1], countries: ["FR", "DE"] },
        query: [
          ["tone[]", "-1"],
          ["tone[]", "1"],
          ["countries[]", "FR"],
          ["countries[]", "DE"],
          ["limit", "20"],
        ],
      },
      {
        args: {
          from: "2026-11-01T08:00:00+01:00",
          to: "2026-11-30",
          source: "news",
          sort: "published_at",
          limit: 50,
        },
        query: [
          ["before_date", "2026-12-01T00:00:00.000Z"],
          ["not_before_date", "2026-11-01T08:00:00+01:00"],
          ["source", "news"],
          ["sort", "published_at"],
          ["limit", "50"],
        ],
      },
      {
        args: { favorite: true, folder: "archive" },
        query: [
          ["folder", "archive"],
          ["favorite", "true"],
          ["limit", "20"],
        ],
      },
      {
        args: { unread: true, folder: "inbox" },
        query: [
          ["folder", "inbox"],
          ["unread", "true"],
          ["limit", "20"],
        ],
      },
      {
        args: { tag: 'say "hi"' },
        query: [
          ["q", 'tags:"say \\"hi\\""'],
          ["limit", "20"],
        ],
      },
      {
        args: { q: "language:en", tag: "launch day" },
        query: [
          ["q", '(language:en) AND tags:"launch day"'],
          ["limit", "20"],
        ],
      },
    ])("should send $args as $query", async ({ args, query }) => {
      mockApiClient.makeRequest.mockResolvedValue({ mentions: [] });

      await callTool("search_mentions", { alert_id: "alert-1", ...args });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        `/accounts/test-account/alerts/alert-1/mentions?${new URLSearchParams(query)}`
      );
    });

    it("should end the range at the current time when only from is given", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      onTestFinished(() => {
        vi.useRealTimers();
      });
      vi.setSystemTime(new Date("2026-11-25T12:00:00.000Z"));
      mockApiClient.makeRequest.mockResolvedValue({ mentions: [] });

      await callTool("search_mentions", { alert_id: "alert-1", from: "2026-11-01" });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        `/accounts/test-account/alerts/alert-1/mentions?${new URLSearchParams({
          before_date: "2026-11-25T12:00:00.000Z",
          not_before_date: "2026-11-01T00:00:00.000Z",
          limit: "20",
        })}`
      );
    });

    it("should reject a date-time without Z or an offset", async () => {
      const result = await callTool("search_mentions", {
        alert_id: "alert-1",
        from: "2026-11-01T08:00:00",
      });

      expect(result).toEqual(errorResult(/Expected a date .* at from$/));
      expect(mockApiClient.makeRequest).not.toHaveBeenCalled();
    });

    it.each([
      [{ unread: true, favorite: true }, "unread cannot be combined with favorite"],
      [{ unread: true, q: "language:en" }, "unread cannot be combined with q"],
      [{ unread: true, tag: "launch" }, "unread cannot be combined with tag"],
      [{ unread: true, tone: [1] }, "unread cannot be combined with tone"],
      [{ favorite: true, tone: [1] }, "favorite cannot be combined with tone"],
      [{ favorite: true, folder: "spam" }, "favorite cannot be combined with folder spam"],
      [{ tone: [-1], folder: "trash" }, "tone cannot be combined with folder trash"],
      [{ tone: [0], q: "language:en" }, "tone cannot be combined with q"],
      [{ tone: [0], tag: "launch" }, "tone cannot be combined with tag"],
      [{ next_page: "token", sort: "direct_reach" }, "next_page cannot be combined with sort"],
    ])("should reject %j", async (args, message) => {
      const result = await callTool("search_mentions", { alert_id: "alert-1", ...args });

      expect(result).toEqual(errorResult(message));
      expect(mockApiClient.getAccountId).not.toHaveBeenCalled();
    });

    it.each([
      "not-a-token",
      Buffer.from(JSON.stringify({ query: "", offset: -1 })).toString("base64url"),
    ])("should reject the next_page %j it did not return", async (next_page) => {
      const result = await callTool("search_mentions", { alert_id: "alert-1", next_page });

      expect(result).toEqual(errorResult("next_page is not a token returned by search_mentions"));
      expect(mockApiClient.makeRequest).not.toHaveBeenCalled();
    });

    it.each([
      { sort: undefined, limits: ["2", "2", "2"] },
      { sort: "published_at", limits: ["2", "2", "2"] },
      { sort: "author_influence.score", limits: ["2", "4", "6"] },
      { sort: "direct_reach", limits: ["2", "4", "6"] },
      { sort: "cumulative_reach", limits: ["2", "4", "6"] },
      { sort: "domain_reach", limits: ["2", "4", "6"] },
    ])(
      "should return each mention once by following next_page with sort $sort",
      async ({ sort, limits }) => {
        const api = fakeMentionsApi(fakeMentions(5));
        const expected = api(`?limit=5${sort ? `&sort=${sort}` : ""}`).mentions.map((m) => m.id);
        mockApiClient.makeRequest.mockImplementation(async (endpoint) => api(endpoint));

        const results = await followPages({ alert_id: "alert-1", limit: 2, sort });

        expect(results.flatMap((result) => pageOf(result).mentions.map((m) => m.id))).toEqual(
          expected
        );
        expect(
          mockApiClient.makeRequest.mock.calls.map(([endpoint]) =>
            new URL(endpoint, "http://localhost").searchParams.get("limit")
          )
        ).toEqual(limits);
      }
    );

    it("should not let a mention published after the first page shift a reach order", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      onTestFinished(() => {
        vi.useRealTimers();
      });
      vi.setSystemTime(new Date("2026-11-21T00:00:00.000Z"));
      const mentions = fakeMentions(5);
      const api = fakeMentionsApi(mentions);
      const expected = api("?limit=5&sort=direct_reach").mentions.map((m) => m.id);
      mockApiClient.makeRequest.mockImplementation(async (endpoint) => api(endpoint));
      mockApiClient.makeRequest.mockImplementationOnce(async (endpoint) => {
        const response = api(endpoint);
        mentions.push({
          ...mentions[0],
          id: "late",
          published_at: "2026-11-22T00:00:00.0+00:00",
          direct_reach: 100,
        });
        return response;
      });

      const results = await followPages({ alert_id: "alert-1", limit: 2, sort: "direct_reach" });

      expect(results.flatMap((result) => pageOf(result).mentions.map((m) => m.id))).toEqual(
        expected
      );
    });

    it("should stop next_page at the first 1000 mentions in a reach order and say so", async () => {
      mockApiClient.makeRequest.mockImplementation(async (endpoint) => {
        const limit = Number(new URL(endpoint, "http://localhost").searchParams.get("limit"));
        return {
          mentions: Array.from({ length: limit }, (_, i) => ({
            id: `m${i}`,
            title: "Title",
            description: "Text",
          })),
        };
      });

      const results = await followPages({ alert_id: "alert-1", limit: 100, sort: "direct_reach" });

      expect(
        mockApiClient.makeRequest.mock.calls.map(([endpoint]) =>
          new URL(endpoint, "http://localhost").searchParams.get("limit")
        )
      ).toEqual(["100", "200", "300", "400", "500", "600", "700", "800", "900", "1000"]);
      expect(results.at(-1)?.content).toEqual([
        {
          type: "text",
          text: "This order pages through the first 1000 mentions only; narrow the search with from and to to reach the others.",
        },
        {
          type: "text",
          text: JSON.stringify({
            mentions: Array.from({ length: 100 }, (_, i) => ({
              id: `m${900 + i}`,
              title: "Title",
              text: "Text",
            })),
          }),
        },
      ]);
    });
  });

  describe("fetch_alert_stats", () => {
    const range = {
      from: "2024-01-01T00:00:00.0",
      to: "2024-01-31T23:59:59.0",
      interval: "P1D",
    };
    const rangeQuery = "from=2024-01-01T00%3A00%3A00.0&to=2024-01-31T23%3A59%3A59.0&interval=P1D";

    it("should fetch stats for single alert with basic parameters", async () => {
      const mockResponse = {
        stats: {
          "alert-123": {
            mentions_per_interval: {
              avg: 250,
              max: 400,
              min: 150,
              total: 1750,
              data: {
                "2024-01-01": 400,
                "2024-01-02": 300,
              },
            },
            alert_id: "alert-123",
          },
        },
        from: "2024-01-01T00:00:00.0+00:00",
        to: "2024-01-31T23:59:59.0+00:00",
      };
      mockApiClient.makeRequest.mockResolvedValue(mockResponse);

      const result = await callTool("fetch_alert_stats", { alerts: ["alert-123"], ...range });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        `/accounts/test-account/stats?alerts%5B%5D=alert-123&${rangeQuery}`
      );
      expect(result).toEqual(textResult(JSON.stringify(mockResponse, null, 2)));
    });

    it("should fetch stats for multiple alerts with complex filters", async () => {
      const mockResponse = {
        stats: {
          "alert-456": { alert_id: "alert-456" },
          "alert-789": { alert_id: "alert-789" },
        },
      };
      mockApiClient.makeRequest.mockResolvedValue(mockResponse);

      const result = await callTool("fetch_alert_stats", {
        alerts: ["alert-456", "alert-789"],
        ...range,
        timezone: "Europe/Berlin",
        tones: [-1, 0, 1],
        languages: ["en", "fr"],
        sources: ["twitter", "web"],
        countries: ["US", "FR"],
        country_stats: 15,
        influencers: true,
        week_day_stats: true,
      });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        `/accounts/test-account/stats?alerts%5B%5D=alert-456&alerts%5B%5D=alert-789&${rangeQuery}&timezone=Europe%2FBerlin&week_day_stats=true&influencers=true&tones%5B%5D=-1&tones%5B%5D=0&tones%5B%5D=1&languages%5B%5D=en&languages%5B%5D=fr&sources%5B%5D=twitter&sources%5B%5D=web&countries%5B%5D=US&countries%5B%5D=FR&country_stats=15`
      );
      expect(result).toEqual(textResult(JSON.stringify(mockResponse, null, 2)));
    });

    it.each([
      { extra: { country_stats: true }, suffix: "country_stats=10" },
      { extra: { country_stats: false }, suffix: "country_stats=0" },
      { extra: { "author_influence.score": "50:100" }, suffix: "author_influence.score=50%3A100" },
    ])("should send $extra as $suffix", async ({ extra, suffix }) => {
      mockApiClient.makeRequest.mockResolvedValue({});

      await callTool("fetch_alert_stats", { alerts: ["alert-123"], ...range, ...extra });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        `/accounts/test-account/stats?alerts%5B%5D=alert-123&${rangeQuery}&${suffix}`
      );
    });

    it.each([
      ["2026-11-01", "2026-11-01T00:00:00.0", "2026-11-01T23:59:59.0"],
      ["2026-11-01T00:00:00Z", "2026-11-01T00:00:00.0", "2026-11-01T00:00:00.0"],
      ["2026-11-01T08:30:15.123Z", "2026-11-01T08:30:15.0", "2026-11-01T08:30:15.0"],
    ])("should send %j as from %j and as to %j", async (input, from, to) => {
      mockApiClient.makeRequest.mockResolvedValue({});

      await callTool("fetch_alert_stats", {
        alerts: ["alert-123"],
        from: input,
        to: input,
        interval: "P1D",
      });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        `/accounts/test-account/stats?alerts%5B%5D=alert-123&${new URLSearchParams({ from, to, interval: "P1D" })}`
      );
    });

    it("should reject a date-time with an offset", async () => {
      const result = await callTool("fetch_alert_stats", {
        alerts: ["alert-123"],
        ...range,
        from: "2026-11-01T00:00:00+01:00",
      });

      expect(result).toEqual(errorResult(/Expected a date .* at from$/));
      expect(mockApiClient.makeRequest).not.toHaveBeenCalled();
    });

    it.each(["from", "to", "interval"])("should reject a call without %s", async (missing) => {
      const result = await callTool("fetch_alert_stats", {
        alerts: ["alert-123"],
        ...range,
        [missing]: undefined,
      });

      expect(result).toEqual(errorResult(new RegExp(`Required at ${missing}$`)));
      expect(mockApiClient.makeRequest).not.toHaveBeenCalled();
    });
  });

  describe("pause_alert and unpause_alert", () => {
    it.each([
      { tool: "pause_alert", action: "pause", text: "Alert alert-123 paused." },
      { tool: "unpause_alert", action: "unpause", text: "Alert alert-123 unpaused." },
    ])("$tool should post to /$action and confirm", async ({ tool, action, text }) => {
      mockApiClient.makeRequest.mockResolvedValue(null);

      const result = await callTool(tool, { alert_id: "alert-123" });

      expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
        `/accounts/test-account/alerts/alert-123/${action}`,
        { method: "POST" }
      );
      expect(result).toEqual(textResult(text));
    });
  });

  describe("alert_id path encoding", () => {
    it.each([
      { tool: "get_alert", path: "/accounts/test-account/alerts/1%2F..%2Fx%3Fy%3D%23z" },
      { tool: "update_alert", path: "/accounts/test-account/alerts/1%2F..%2Fx%3Fy%3D%23z" },
      { tool: "pause_alert", path: "/accounts/test-account/alerts/1%2F..%2Fx%3Fy%3D%23z/pause" },
      {
        tool: "unpause_alert",
        path: "/accounts/test-account/alerts/1%2F..%2Fx%3Fy%3D%23z/unpause",
      },
      {
        tool: "search_mentions",
        path: "/accounts/test-account/alerts/1%2F..%2Fx%3Fy%3D%23z/mentions?limit=20",
      },
    ])("$tool should keep the alert_id in a single path segment", async ({ tool, path }) => {
      mockApiClient.makeRequest.mockResolvedValue({});

      await callTool(tool, { alert_id: "1/../x?y=#z" });

      expect(mockApiClient.makeRequest).toHaveBeenCalledOnce();
      expect(mockApiClient.makeRequest.mock.calls[0][0]).toBe(path);
    });

    it.each(["", ".", ".."])("should reject alert_id %j", async (alert_id) => {
      const result = await callTool("pause_alert", { alert_id });

      expect(result).toEqual(errorResult(`MCP error -32602: Invalid path segment: "${alert_id}"`));
      expect(mockApiClient.makeRequest).not.toHaveBeenCalled();
    });
  });

  describe("build-boolean-query prompt", () => {
    it("should require instructions and include them in the message", async () => {
      const { prompts } = await client.listPrompts();
      const { messages } = await client.getPrompt({
        name: "build-boolean-query",
        arguments: { instructions: "Mentions about NASA in English" },
      });

      expect(prompts).toEqual([
        expect.objectContaining({
          name: "build-boolean-query",
          arguments: [expect.objectContaining({ name: "instructions", required: true })],
        }),
      ]);
      expect(messages).toEqual([
        {
          role: "user",
          content: {
            type: "text",
            text: expect.stringContaining("Mentions about NASA in English"),
          },
        },
      ]);
    });

    it("should reject a call without instructions as invalid params", async () => {
      await expect(
        client.getPrompt({ name: "build-boolean-query", arguments: {} })
      ).rejects.toMatchObject({
        code: ErrorCode.InvalidParams,
        message: expect.stringMatching(/Required at instructions/),
      });
    });
  });
});
