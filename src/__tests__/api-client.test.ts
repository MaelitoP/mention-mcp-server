import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { type MockedFunction, beforeEach, describe, expect, it, vi } from "vitest";
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
      enableConsoleLogging: false,
      requestTimeout: 5000,
      maxRetries: 3,
    };
    client = new MentionAPIClient(config);
    mockFetch.mockReset();
  });

  describe("makeRequest", () => {
    it("should make successful API request", async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ data: "test" }) };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.makeRequest("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
            "Content-Type": "application/json",
            "User-Agent": "mention-mcp-server/1.0.0",
          }),
        })
      );
      expect(result).toEqual({ data: "test" });
    });

    it("should handle 401 error properly", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          error: { code: 401, message: "Unauthorized" },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.makeRequest("/test")).rejects.toThrow(
        new McpError(ErrorCode.InvalidRequest, "Invalid API key")
      );
    });

    it("should handle 403 error properly", async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({
          error: { code: 403, message: "Forbidden" },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.makeRequest("/test")).rejects.toThrow(
        new McpError(ErrorCode.InvalidRequest, "Access denied")
      );
    });

    it("should handle 429 rate limit error properly", async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({
          error: { code: 429, message: "Rate limit exceeded" },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

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

    it("should handle timeout", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      await expect(client.makeRequest("/test")).rejects.toThrow(
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

      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockAccountData) };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result1 = await client.getAccountInfo();
      expect(result1).toEqual(mockAccountData);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const result2 = await client.getAccountInfo();
      expect(result2).toEqual(mockAccountData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should refresh cache after expiry", async () => {
      const mockAccountData = {
        account: {
          id: "test-account",
          subscription: { advanced_query_access: true },
        },
      };

      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockAccountData) };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.getAccountInfo();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      client.clearAccountCache();

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

      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockAccountData) };
      mockFetch.mockResolvedValue(mockResponse as any);

      const accountId = await client.getAccountId();
      expect(accountId).toBe("test-account-id");
    });
  });
});
