import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";

describe("Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load config with required API key", () => {
    process.env.MENTION_API_KEY = "test-api-key";

    const config = loadConfig();

    expect(config.apiKey).toBe("test-api-key");
    expect(config.apiBaseUrl).toBe("https://web.mention.com/api");
    expect(config.logLevel).toBe("info");
    expect(config.enableConsoleLogging).toBe(false);
    expect(config.requestTimeout).toBe(30000);
    expect(config.maxRetries).toBe(3);
  });

  it("should throw error when API key is missing", () => {
    process.env.MENTION_API_KEY = undefined;

    expect(() => loadConfig()).toThrow("MENTION_API_KEY environment variable is required");
  });

  it("should use custom environment variables", () => {
    process.env.MENTION_API_KEY = "test-api-key";
    process.env.MENTION_API_BASE_URL = "https://custom.api.com";
    process.env.MCP_LOG_LEVEL = "debug";
    process.env.MCP_CONSOLE_LOGGING = "true";
    process.env.MCP_REQUEST_TIMEOUT = "60000";
    process.env.MCP_MAX_RETRIES = "5";

    const config = loadConfig();

    expect(config.apiBaseUrl).toBe("https://custom.api.com");
    expect(config.logLevel).toBe("debug");
    expect(config.enableConsoleLogging).toBe(true);
    expect(config.requestTimeout).toBe(60000);
    expect(config.maxRetries).toBe(5);
  });

  it("should handle invalid number values gracefully", () => {
    process.env.MENTION_API_KEY = "test-api-key";
    process.env.MCP_REQUEST_TIMEOUT = "invalid";
    process.env.MCP_MAX_RETRIES = "not-a-number";

    const config = loadConfig();

    expect(config.requestTimeout).toBe(Number.NaN);
    expect(config.maxRetries).toBe(Number.NaN);
  });
});
