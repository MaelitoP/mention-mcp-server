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
    expect(config.requestTimeout).toBe(30000);
  });

  it("should throw error when API key is missing", () => {
    process.env.MENTION_API_KEY = undefined;

    expect(() => loadConfig()).toThrow("MENTION_API_KEY environment variable is required");
  });

  it("should use custom environment variables", () => {
    process.env.MENTION_API_KEY = "test-api-key";
    process.env.MENTION_API_BASE_URL = "https://custom.api.com";
    process.env.MCP_LOG_LEVEL = "debug";
    process.env.MCP_REQUEST_TIMEOUT = "60000";

    const config = loadConfig();

    expect(config.apiBaseUrl).toBe("https://custom.api.com");
    expect(config.logLevel).toBe("debug");
    expect(config.requestTimeout).toBe(60000);
  });

  it.each([
    { timeout: "", expected: 30000 },
    { timeout: "1", expected: 1 },
    { timeout: "2147483647", expected: 2147483647 },
  ])("should accept MCP_REQUEST_TIMEOUT=$timeout", ({ timeout, expected }) => {
    process.env.MENTION_API_KEY = "test-api-key";
    process.env.MCP_REQUEST_TIMEOUT = timeout;

    expect(loadConfig().requestTimeout).toBe(expected);
  });

  it.each(["abc", "30s", "0", "-1", "1.5", "2147483648"])(
    "should reject MCP_REQUEST_TIMEOUT=%s",
    (timeout) => {
      process.env.MENTION_API_KEY = "test-api-key";
      process.env.MCP_REQUEST_TIMEOUT = timeout;

      expect(() => loadConfig()).toThrow(
        `MCP_REQUEST_TIMEOUT must be a whole number of milliseconds between 1 and 2147483647, got "${timeout}"`
      );
    }
  );
});
