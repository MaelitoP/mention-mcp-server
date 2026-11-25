#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { MentionAPIClient } from "./api-client.js";
import { loadConfig } from "./config.js";
import { logError, logInfo } from "./logger.js";
import { createServer } from "./server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getPackageVersion(): string {
  try {
    const packageJsonPath = join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version || "1.0.0";
  } catch (error) {
    logError("Failed to read package.json version", error);
    return "1.0.0";
  }
}

async function main() {
  try {
    logInfo("Starting MCP server");

    const version = getPackageVersion();
    const config = loadConfig();
    const server = createServer(new MentionAPIClient(config, version), version, {
      readOnly: config.readOnly,
    });
    const transport = new StdioServerTransport();

    await server.connect(transport);
  } catch (error) {
    logError("Failed to start MCP server", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  logInfo("Received SIGINT, shutting down gracefully");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logInfo("Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

main().catch((error) => {
  logError("Fatal error in main", error);
  process.exit(1);
});
