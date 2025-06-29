import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { type MockedFunction, beforeEach, describe, expect, it, vi } from "vitest";
import type { MentionAPIClient } from "../api-client.js";
import { ToolHandlers, getToolDefinitions } from "../tools/index.js";

// Mock logger
vi.mock("../logger.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

describe("Tools", () => {
  let toolHandlers: ToolHandlers;
  let mockApiClient: Partial<MentionAPIClient>;

  beforeEach(() => {
    mockApiClient = {
      getAccountInfo: vi.fn(),
      getAccountId: vi.fn(),
      makeRequest: vi.fn(),
    };
    toolHandlers = new ToolHandlers(mockApiClient as MentionAPIClient);
  });

  describe("getToolDefinitions", () => {
    it("should return all tool definitions", () => {
      const tools = getToolDefinitions();

      expect(tools).toHaveLength(11);
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
        "fetch_mentions",
        "fetch_alert_stats",
      ]);
    });

    it("should have proper schemas for all tools", () => {
      const tools = getToolDefinitions();

      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe("string");
      }
    });
  });

  describe("ToolHandlers", () => {
    describe("handleGetAccountInfo", () => {
      it("should return formatted account info", async () => {
        const mockAccountData = {
          account: {
            id: "test-account",
            subscription: { advanced_query_access: true },
            groups: [{ id: "group1", name: "Test Group" }],
          },
        };

        (mockApiClient.getAccountInfo as MockedFunction<any>).mockResolvedValue(mockAccountData);

        const result = await toolHandlers.handleTool("get_account_info", {});

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe("text");

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.accountId).toBe("test-account");
        expect(responseData.canCreateAdvancedAlert).toBe(true);
        expect(responseData.groups).toHaveLength(1);
      });

      it("should handle missing groups", async () => {
        const mockAccountData = {
          account: {
            id: "test-account",
            subscription: { advanced_query_access: false },
          },
        };

        (mockApiClient.getAccountInfo as MockedFunction<any>).mockResolvedValue(mockAccountData);

        const result = await toolHandlers.handleTool("get_account_info", {});
        const responseData = JSON.parse(result.content[0].text);

        expect(responseData.groups).toEqual([]);
      });
    });

    describe("handleListAlerts", () => {
      it("should list alerts with pagination", async () => {
        const mockAlertsData = {
          alerts: [{ id: "alert1", name: "Test Alert" }],
          pagination: { cursor: "next-page" },
        };

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockAlertsData);

        const result = await toolHandlers.handleTool("list_alerts", { limit: 10, cursor: "page1" });

        expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
          "/accounts/test-account/alerts?limit=10&cursor=page1"
        );
        expect(result.content[0].text).toBe(JSON.stringify(mockAlertsData, null, 2));
      });

      it("should handle no pagination parameters", async () => {
        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue({ alerts: [] });

        await toolHandlers.handleTool("list_alerts", {});

        expect(mockApiClient.makeRequest).toHaveBeenCalledWith("/accounts/test-account/alerts");
      });
    });

    describe("handleCreateBasicAlert", () => {
      it("should create basic alert", async () => {
        const alertArgs = {
          group_id: "group-123",
          name: "Test Alert",
          included_keywords: ["test"],
          excluded_keywords: ["spam"],
          languages: ["en"],
          sources: ["web"],
        };

        const mockResponse = { alert: { id: "new-alert" } };

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockResponse);

        const result = await toolHandlers.handleTool("create_basic_alert", alertArgs);

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
        expect(result.content[0].text).toBe("new-alert");
      });
    });

    describe("handleCreateAdvancedAlert", () => {
      it("should create advanced alert", async () => {
        const alertArgs = {
          group_id: "group-123",
          name: "Advanced Alert",
          query_string: "(NASA OR SpaceX) AND mars",
          languages: ["en"],
          sources: ["web"],
        };

        const mockResponse = { alert: { id: "new-alert" } };

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockResponse);

        const result = await toolHandlers.handleTool("create_advanced_alert", alertArgs);

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
        expect(result.content[0].text).toBe("new-alert");
      });
    });

    describe("handleFetchMentions", () => {
      it("should fetch mentions with basic parameters", async () => {
        const mentionsArgs = {
          alert_id: "alert-123",
          limit: 10,
          folder: "inbox" as const,
        };

        const mockResponse = {
          mentions: [
            { id: "mention-1", content: "Test mention 1" },
            { id: "mention-2", content: "Test mention 2" },
          ],
          _links: {
            more: { href: "https://api.mention.net/api/.../mentions?cursor=older" },
            pull: { href: "https://api.mention.net/api/.../mentions?cursor=newer" },
          },
        };

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockResponse);

        const result = await toolHandlers.handleTool("fetch_mentions", mentionsArgs);

        expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
          "/accounts/test-account/alerts/alert-123/mentions?limit=10&folder=inbox"
        );
        expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
      });

      it("should fetch mentions with complex filters", async () => {
        const mentionsArgs = {
          alert_id: "alert-456",
          limit: 50,
          source: "twitter",
          tone: [1],
          countries: ["US", "FR"],
          languages: ["en", "fr"],
          unread: true,
        };

        const mockResponse = {
          mentions: [{ id: "mention-1", content: "Twitter mention" }],
          _links: {},
        };

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockResponse);

        const result = await toolHandlers.handleTool("fetch_mentions", mentionsArgs);

        const expectedUrl =
          "/accounts/test-account/alerts/alert-456/mentions?limit=50&source=twitter&unread=true&tone=1&countries=US&countries=FR&languages=en&languages=fr";
        expect(mockApiClient.makeRequest).toHaveBeenCalledWith(expectedUrl);
        expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
      });

      it("should fetch mentions with no parameters", async () => {
        const mentionsArgs = {
          alert_id: "alert-789",
        };

        const mockResponse = {
          mentions: [],
          _links: {},
        };

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockResponse);

        const result = await toolHandlers.handleTool("fetch_mentions", mentionsArgs);

        expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
          "/accounts/test-account/alerts/alert-789/mentions"
        );
        expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });

    describe("handleFetchAlertStats", () => {
      it("should fetch stats for single alert with basic parameters", async () => {
        const statsArgs = {
          alerts: ["alert-123"],
          from: "2024-01-01T00:00:00.0",
          to: "2024-01-31T23:59:59.0",
          interval: "P1D" as const,
        };

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

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockResponse);

        const result = await toolHandlers.handleTool("fetch_alert_stats", statsArgs);

        expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
          "/accounts/test-account/stats?alerts%5B%5D=alert-123&from=2024-01-01T00%3A00%3A00.0&to=2024-01-31T23%3A59%3A59.0&interval=P1D"
        );
        expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
      });

      it("should fetch stats for multiple alerts with complex filters", async () => {
        const statsArgs = {
          alerts: ["alert-456", "alert-789"],
          timezone: "Europe/Berlin",
          tones: [-1, 0, 1],
          languages: ["en", "fr"],
          sources: ["twitter", "web"],
          countries: ["US", "FR"],
          country_stats: 15,
          influencers: true,
          week_day_stats: true,
        };

        const mockResponse = {
          stats: {
            "alert-456": { alert_id: "alert-456" },
            "alert-789": { alert_id: "alert-789" },
          },
        };

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockResponse);

        const result = await toolHandlers.handleTool("fetch_alert_stats", statsArgs);

        const expectedUrl =
          "/accounts/test-account/stats?alerts%5B%5D=alert-456&alerts%5B%5D=alert-789&timezone=Europe%2FBerlin&week_day_stats=true&influencers=true&tones%5B%5D=-1&tones%5B%5D=0&tones%5B%5D=1&languages%5B%5D=en&languages%5B%5D=fr&sources%5B%5D=twitter&sources%5B%5D=web&countries%5B%5D=US&countries%5B%5D=FR&country_stats=15";
        expect(mockApiClient.makeRequest).toHaveBeenCalledWith(expectedUrl);
        expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
      });

      it("should handle boolean country_stats parameter", async () => {
        const statsArgs = {
          alerts: ["alert-123"],
          country_stats: true,
        };

        const mockResponse = {
          stats: { "alert-123": { alert_id: "alert-123" } },
        };

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockResponse);

        const result = await toolHandlers.handleTool("fetch_alert_stats", statsArgs);

        expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
          "/accounts/test-account/stats?alerts%5B%5D=alert-123&country_stats=10"
        );
        expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
      });

      it("should handle author influence score filter", async () => {
        const statsArgs = {
          alerts: ["alert-123"],
          "author_influence.score": "50:100",
        };

        const mockResponse = {
          stats: { "alert-123": { alert_id: "alert-123" } },
        };

        (mockApiClient.getAccountId as MockedFunction<any>).mockResolvedValue("test-account");
        (mockApiClient.makeRequest as MockedFunction<any>).mockResolvedValue(mockResponse);

        const result = await toolHandlers.handleTool("fetch_alert_stats", statsArgs);

        expect(mockApiClient.makeRequest).toHaveBeenCalledWith(
          "/accounts/test-account/stats?alerts%5B%5D=alert-123&author_influence.score=50%3A100"
        );
        expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
      });
    });

    describe("handleTool", () => {
      it("should throw error for unknown tool", async () => {
        await expect(toolHandlers.handleTool("unknown_tool", {})).rejects.toThrow(
          new McpError(ErrorCode.MethodNotFound, "Unknown tool: unknown_tool")
        );
      });

      it("should handle validation errors", async () => {
        await expect(toolHandlers.handleTool("create_basic_alert", { name: "" })).rejects.toThrow();
      });
    });
  });
});
