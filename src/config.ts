export interface Config {
  apiKey: string;
  apiBaseUrl: string;
  logLevel: string;
  requestTimeout: number;
  readOnly: boolean;
}

// AbortSignal.timeout uses Node timers, which fire after 1 ms above a signed 32-bit delay.
const MAX_TIMER_DELAY_MS = 2_147_483_647;

function parseRequestTimeout(value: string): number {
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > MAX_TIMER_DELAY_MS) {
    throw new Error(
      `MCP_REQUEST_TIMEOUT must be a whole number of milliseconds between 1 and ${MAX_TIMER_DELAY_MS}, got "${value}"`
    );
  }
  return timeout;
}

function parseReadOnly(value: string): boolean {
  if (value !== "true" && value !== "false") {
    throw new Error(`MENTION_READ_ONLY must be "true" or "false", got "${value}"`);
  }
  return value === "true";
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
    requestTimeout: parseRequestTimeout(process.env.MCP_REQUEST_TIMEOUT || "30000"),
    readOnly: parseReadOnly(process.env.MENTION_READ_ONLY || "false"),
  };
}
