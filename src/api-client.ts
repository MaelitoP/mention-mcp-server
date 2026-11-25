import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { Config } from "./config.js";
import { logDebug, logError } from "./logger.js";
import type { AccountResponse } from "./types.js";
import { AccountResponseSchema } from "./types.js";

export function apiPath(strings: TemplateStringsArray, ...segments: string[]): string {
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new McpError(ErrorCode.InvalidParams, `Invalid path segment: "${segment}"`);
    }
  }
  return String.raw({ raw: strings }, ...segments.map(encodeURIComponent));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function formErrors(node: unknown, path = ""): string[] {
  if (!isRecord(node)) {
    return [];
  }
  const own = Array.isArray(node.errors)
    ? node.errors.map((message: unknown) =>
        path ? `${path}: ${asText(message)}` : asText(message)
      )
    : [];
  const children = isRecord(node.children)
    ? Object.entries(node.children).flatMap(([name, child]) =>
        formErrors(child, path ? `${path}.${name}` : name)
      )
    : [];
  return [...own, ...children];
}

function formatBooleanError(error: unknown): string {
  if (!isRecord(error) || typeof error.message !== "string") {
    return asText(error);
  }
  const bounds: unknown[] = Array.isArray(error.bounds) ? error.bounds : [];
  const positions = bounds.flatMap((bound) =>
    isRecord(bound) &&
    isRecord(bound.from) &&
    typeof bound.from.row === "number" &&
    typeof bound.from.column === "number"
      ? [`line ${bound.from.row + 1}, column ${bound.from.column + 1}`]
      : []
  );
  return positions.length > 0 ? `${error.message} (at ${positions.join("; ")})` : error.message;
}

function errorReason(body: unknown): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }
  const booleanErrors = Array.isArray(body.boolean_errors)
    ? body.boolean_errors.map(formatBooleanError)
    : [];
  const formLines = formErrors(body.form).filter(
    (line) => booleanErrors.length === 0 || !line.startsWith("query.query_string: ")
  );
  const lines = [...booleanErrors, ...formLines];
  if (lines.length > 0) {
    return lines.join("\n");
  }
  if (typeof body.message === "string") {
    return body.message;
  }
  if (typeof body.error === "string") {
    return body.error;
  }
  if (isRecord(body.error) && typeof body.error.message === "string") {
    return typeof body.error.details === "string"
      ? `${body.error.message} - ${body.error.details}`
      : body.error.message;
  }
  return undefined;
}

export class MentionAPIClient {
  private config: Config;
  private readonly userAgent: string;
  private accountCache: AccountResponse | null = null;
  private accountCacheExpiry = 0;
  private readonly accountCacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Config, serverVersion: string) {
    this.config = config;
    this.userAgent = `mention-mcp-server/${serverVersion}`;
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    const requestId = Math.random().toString(36).substring(7);

    logDebug("Making API request", { requestId, endpoint, method: options.method || "GET" });

    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(this.config.requestTimeout),
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": this.userAgent,
          "Accept-Version": "1.21",
          ...options.headers,
        },
      });

      if (!response.ok) {
        let rawErrorData: unknown;

        try {
          rawErrorData = await response.json();
          logError("API response error", {
            requestId,
            endpoint,
            status: response.status,
            statusText: response.statusText,
            responseBody: rawErrorData,
          });
        } catch (parseError) {
          logError("Mention API request failed - could not parse error response", {
            requestId,
            endpoint,
            status: response.status,
            statusText: response.statusText,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
          });
          throw new McpError(
            ErrorCode.InternalError,
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        if (response.status === 401) {
          throw new McpError(ErrorCode.InvalidRequest, "Invalid API key");
        }
        const reason = errorReason(rawErrorData);
        if (response.status === 403) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            reason ? `Access denied: ${reason}` : "Access denied"
          );
        }
        if (response.status === 429) {
          throw new McpError(
            ErrorCode.InternalError,
            "Rate limit exceeded - please try again later"
          );
        }

        throw new McpError(
          ErrorCode.InternalError,
          reason
            ? `Mention API Error (HTTP ${response.status}): ${reason}`
            : `HTTP ${response.status}: ${response.statusText} - ${JSON.stringify(rawErrorData)}`
        );
      }

      const responseText = await response.text();
      const responseData = responseText ? JSON.parse(responseText) : null;
      logDebug("API request successful", { requestId, endpoint });
      return responseData;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      if (error instanceof Error && error.name === "TimeoutError") {
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
}
