import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { type MockedFunction, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MentionAPIClient } from "../api-client.js";
import type { Config } from "../config.js";

const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

vi.mock("../logger.js", () => ({
  logError: vi.fn(),
  logDebug: vi.fn(),
}));

describe("MentionAPIClient", () => {
  let client: MentionAPIClient;
  let config: Config;

  beforeEach(() => {
    config = {
      apiKey: "test-api-key",
      apiBaseUrl: "https://api.test.com",
      logLevel: "info",
      requestTimeout: 5000,
      readOnly: false,
    };
    client = new MentionAPIClient(config, "1.2.3");
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("makeRequest", () => {
    it("should make successful API request", async () => {
      mockFetch.mockResolvedValue(Response.json({ data: "test" }));

      const result = await client.makeRequest("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
            "Content-Type": "application/json",
            "User-Agent": "mention-mcp-server/1.2.3",
            "Accept-Version": "1.21",
          }),
        })
      );
      expect(result).toEqual({ data: "test" });
    });

    it.each([
      { label: "204", status: 204, body: null },
      { label: "200 with an empty body", status: 200, body: "" },
    ])("should resolve to null for a $label response", async ({ status, body }) => {
      mockFetch.mockResolvedValue(new Response(body, { status }));

      await expect(client.makeRequest("/test", { method: "POST" })).resolves.toBeNull();
    });

    it("should handle 401 error properly", async () => {
      mockFetch.mockResolvedValue(
        Response.json({ error: { code: 401, message: "Unauthorized" } }, { status: 401 })
      );

      await expect(client.makeRequest("/test")).rejects.toThrow(
        new McpError(ErrorCode.InvalidRequest, "Invalid API key")
      );
    });

    const syntaxError = (line: number, column: number) => ({
      message: `Syntax error, unexpected EOF on line ${line}, column ${column}`,
      level: "error",
      bounds: [
        {
          from: { row: line - 1, column: column - 1, column_utf16: column - 1 },
          to: { row: line - 1, column: column - 1, column_utf16: column - 1 },
        },
      ],
    });
    const planReason = "Your plan has no statistics access";

    it.each([
      {
        label: "a 403 with an error field",
        status: 403,
        body: { error: planReason },
        error: new McpError(ErrorCode.InvalidRequest, `Access denied: ${planReason}`),
      },
      {
        label: "a 403 with a message field",
        status: 403,
        body: { code: 403, message: planReason },
        error: new McpError(ErrorCode.InvalidRequest, `Access denied: ${planReason}`),
      },
      {
        label: "a 403 without a reason",
        status: 403,
        body: {},
        error: new McpError(ErrorCode.InvalidRequest, "Access denied"),
      },
      {
        label: "a 400 with a field error",
        status: 400,
        body: {
          form: {
            children: {
              alerts: { children: [[]] },
              from: { errors: ["This value is not valid."] },
              to: [],
            },
          },
        },
        error: new McpError(
          ErrorCode.InternalError,
          "Mention API Error (HTTP 400): from: This value is not valid."
        ),
      },
      {
        label: "a 400 with a form error",
        status: 400,
        body: {
          form: {
            errors: ["This form should not contain extra fields."],
            children: { alerts: { children: [[]] }, from: [], to: [] },
          },
        },
        error: new McpError(
          ErrorCode.InternalError,
          "Mention API Error (HTTP 400): This form should not contain extra fields."
        ),
      },
      {
        label: "a 400 with nested field errors",
        status: 400,
        body: {
          form: {
            children: {
              name: [],
              query: {
                children: {
                  type: { errors: ["Query type can not be changed"] },
                  required_keywords: { errors: ["One keyword min."] },
                },
              },
            },
          },
          max_alerts_reached: false,
          boolean_errors: [],
        },
        error: new McpError(
          ErrorCode.InternalError,
          "Mention API Error (HTTP 400): query.type: Query type can not be changed\nquery.required_keywords: One keyword min."
        ),
      },
      {
        label: "a 400 with Boolean query errors and a field error",
        status: 400,
        body: {
          form: {
            children: {
              name: { errors: ["This value should not be blank."] },
              query: {
                children: {
                  type: [],
                  query_string: {
                    errors: ["Syntax error, unexpected EOF on line 1, column 18"],
                  },
                },
              },
            },
          },
          max_alerts_reached: false,
          boolean_errors: [syntaxError(1, 18), syntaxError(2, 5)],
        },
        error: new McpError(
          ErrorCode.InternalError,
          "Mention API Error (HTTP 400): Syntax error, unexpected EOF on line 1, column 18 (at line 1, column 18)\nSyntax error, unexpected EOF on line 2, column 5 (at line 2, column 5)\nname: This value should not be blank."
        ),
      },
      {
        label: "a 500 without a known reason",
        status: 500,
        body: { foo: 1 },
        error: new McpError(ErrorCode.InternalError, 'HTTP 500: Internal Server Error - {"foo":1}'),
      },
    ])("should describe $label", async ({ status, body, error }) => {
      mockFetch.mockResolvedValue(
        Response.json(body, {
          status,
          statusText: status === 500 ? "Internal Server Error" : "",
        })
      );

      await expect(client.makeRequest("/test")).rejects.toThrow(error);
    });

    it("should handle 429 rate limit error properly", async () => {
      mockFetch.mockResolvedValue(
        Response.json({ error: { code: 429, message: "Rate limit exceeded" } }, { status: 429 })
      );

      await expect(client.makeRequest("/test")).rejects.toThrow(
        new McpError(ErrorCode.InternalError, "Rate limit exceeded - please try again later")
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(client.makeRequest("/test")).rejects.toThrow(
        new McpError(ErrorCode.InternalError, "Network request failed: Network error")
      );
    });

    it("should time out when the response body stalls", { timeout: 1000 }, async () => {
      const slowClient = new MentionAPIClient({ ...config, requestTimeout: 10 }, "1.2.3");
      mockFetch.mockImplementation(async (_url, init) => {
        const signal = init?.signal;
        const body = new ReadableStream({
          start(controller) {
            signal?.addEventListener("abort", () => controller.error(signal.reason));
          },
        });
        return new Response(body);
      });

      await expect(slowClient.makeRequest("/test")).rejects.toThrow(
        new McpError(ErrorCode.InternalError, "Request timeout")
      );
    });
  });

  describe("getAccountInfo", () => {
    it("should cache account info", async () => {
      const mockAccountData = {
        account: {
          id: "test-account",
          subscription: { advanced_query_access: true },
          groups: [{ id: "group1", name: "Test Group" }],
        },
      };

      mockFetch.mockResolvedValue(Response.json(mockAccountData));

      const result1 = await client.getAccountInfo();
      expect(result1).toEqual(mockAccountData);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const result2 = await client.getAccountInfo();
      expect(result2).toEqual(mockAccountData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should refresh cache after expiry", async () => {
      vi.useFakeTimers();
      const mockAccountData = {
        account: {
          id: "test-account",
          subscription: { advanced_query_access: true },
        },
      };

      mockFetch.mockImplementation(async () => Response.json(mockAccountData));

      await client.getAccountInfo();
      vi.advanceTimersByTime(5 * 60 * 1000 - 1);
      await client.getAccountInfo();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      await client.getAccountInfo();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getAccountId", () => {
    it("should return account ID from account info", async () => {
      const mockAccountData = {
        account: {
          id: "test-account-id",
          subscription: { advanced_query_access: true },
        },
      };

      mockFetch.mockResolvedValue(Response.json(mockAccountData));

      const accountId = await client.getAccountId();
      expect(accountId).toBe("test-account-id");
    });
  });
});
