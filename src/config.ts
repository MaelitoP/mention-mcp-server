export interface Config {
  apiKey: string;
  apiBaseUrl: string;
  logLevel: string;
  enableConsoleLogging: boolean;
  requestTimeout: number;
  maxRetries: number;
}

export function loadConfig(): Config {
  const apiKey = process.env.MENTION_API_KEY;
  if (!apiKey) {
    throw new Error("MENTION_API_KEY environment variable is required");
  }

  return {
    apiKey,
    apiBaseUrl: process.env.MENTION_API_BASE_URL || "https://web.mention.com/api",
    logLevel: process.env.MCP_LOG_LEVEL || "info",
    enableConsoleLogging: process.env.MCP_CONSOLE_LOGGING === "true",
    requestTimeout: Number.parseInt(process.env.MCP_REQUEST_TIMEOUT || "30000", 10),
    maxRetries: Number.parseInt(process.env.MCP_MAX_RETRIES || "3", 10),
  };
}
