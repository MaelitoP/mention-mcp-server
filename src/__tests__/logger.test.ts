import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logDebug, logError, logInfo, logWarn } from "../logger.js";

describe("Logger", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  function captureOutput() {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const entries = () => stderr.mock.calls.map(([chunk]) => JSON.parse(String(chunk)));
    return { stderr, stdout, entries };
  }

  it("should write one JSON line per entry to stderr and nothing to stdout", () => {
    const { stderr, stdout, entries } = captureOutput();

    logError(
      "Failed to load configuration",
      new Error("MENTION_API_KEY environment variable is required"),
      { attempt: 1 }
    );

    expect(stdout).not.toHaveBeenCalled();
    expect(String(stderr.mock.calls[0][0])).toMatch(/^\{.*\}\n$/);
    expect(entries()).toEqual([
      {
        time: expect.any(String),
        level: "error",
        msg: "Failed to load configuration",
        context: { attempt: 1 },
        error: {
          name: "Error",
          message: "MENTION_API_KEY environment variable is required",
          stack: expect.any(String),
        },
      },
    ]);
  });

  it.each([
    { level: undefined, expected: ["info", "warn"] },
    { level: "verbose", expected: ["info", "warn"] },
    { level: "toString", expected: ["info", "warn"] },
    { level: "debug", expected: ["debug", "info", "warn"] },
    { level: "warn", expected: ["warn"] },
  ])("should log $expected when MCP_LOG_LEVEL is $level", ({ level, expected }) => {
    process.env.MCP_LOG_LEVEL = level;
    const { entries } = captureOutput();

    logDebug("Making API request", { attempt: 1 });
    logInfo("Tool call started", { attempt: 1 });
    logWarn("Rate limited", { attempt: 1 });

    expect(entries().map((entry) => ({ level: entry.level, context: entry.context }))).toEqual(
      expected.map((expectedLevel) => ({ level: expectedLevel, context: { attempt: 1 } }))
    );
  });

  it("should still write the message when the context cannot be serialized", () => {
    const { entries } = captureOutput();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    logError("Tool call failed", new Error("boom"), circular);

    expect(entries()).toEqual([
      expect.objectContaining({ level: "error", msg: "Tool call failed" }),
    ]);
  });
});
