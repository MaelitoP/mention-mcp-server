import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { Config } from "./config.js";
import { logDebug, logError } from "./logger.js";
import type { AccountResponse, MentionAPIError } from "./types.js";
import { AccountResponseSchema } from "./types.js";

export class MentionAPIClient {
  private config: Config;
  private accountCache: AccountResponse | null = null;
  private accountCacheExpiry = 0;
  private readonly accountCacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Config) {
    this.config = config;
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    const requestId = Math.random().toString(36).substring(7);

    logDebug("Making API request", { requestId, endpoint, method: options.method || "GET" });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "mention-mcp-server/1.0.0",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: MentionAPIError;
        try {
          errorData = (await response.json()) as MentionAPIError;
        } catch {
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
          logError("Mention API request failed", { requestId, endpoint, status: response.status });
          throw new McpError(ErrorCode.InternalError, errorMsg);
        }

        const errorMsg = `Mention API Error: ${errorData.error.message}${
          errorData.error.details ? ` - ${errorData.error.details}` : ""
        }`;
        logError("Mention API error", errorData.error, { requestId, endpoint });

        // Map specific API errors to appropriate MCP errors
        if (response.status === 401) {
          throw new McpError(ErrorCode.InvalidRequest, "Invalid API key");
        }
        if (response.status === 403) {
          throw new McpError(ErrorCode.InvalidRequest, "Access denied - check subscription plan");
        }
        if (response.status === 429) {
          throw new McpError(
            ErrorCode.InternalError,
            "Rate limit exceeded - please try again later"
          );
        }

        throw new McpError(ErrorCode.InternalError, errorMsg);
      }

      const responseData = await response.json();
      logDebug("API request successful", { requestId, endpoint });
      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof McpError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        const errorMsg = "Request timeout";
        logError(errorMsg, error, { requestId, endpoint, timeout: this.config.requestTimeout });
        throw new McpError(ErrorCode.InternalError, errorMsg);
      }

      const errorMsg = `Network request failed: ${error instanceof Error ? error.message : String(error)}`;
      logError(errorMsg, error, { requestId, endpoint });
      throw new McpError(ErrorCode.InternalError, errorMsg);
    }
  }

  async getAccountInfo(): Promise<AccountResponse> {
    const now = Date.now();

    if (this.accountCache && now < this.accountCacheExpiry) {
      logDebug("Using cached account info");
      return this.accountCache;
    }

    try {
      const rawData = await this.makeRequest("/accounts/me");
      const data = AccountResponseSchema.parse(rawData);

      // Cache the account info
      this.accountCache = data;
      this.accountCacheExpiry = now + this.accountCacheTTL;

      logDebug("Account info retrieved and cached", { accountId: data.account.id });
      return data;
    } catch (error) {
      logError("Failed to get account info", error);
      throw error;
    }
  }

  async getAccountId(): Promise<string> {
    const accountInfo = await this.getAccountInfo();
    return accountInfo.account.id;
  }

  clearAccountCache(): void {
    this.accountCache = null;
    this.accountCacheExpiry = 0;
    logDebug("Account cache cleared");
  }
}
