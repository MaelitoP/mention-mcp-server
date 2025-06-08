#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { MentionAPIClient } from "./api-client.js";
import { loadConfig } from "./config.js";
import { logError, logInfo } from "./logger.js";
import { ToolHandlers, getToolDefinitions } from "./tools/index.js";

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

async function createServer() {
  let config: ReturnType<typeof loadConfig>;

  try {
    config = loadConfig();
  } catch (error) {
    logError("Failed to load configuration", error);
    throw error;
  }

  const version = getPackageVersion();
  const apiClient = new MentionAPIClient(config);
  const toolHandlers = new ToolHandlers(apiClient);

  const server = new Server(
    {
      name: "mention-mcp-server",
      version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getToolDefinitions(),
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [],
    };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await toolHandlers.handleTool(name, args);
  });

  return server;
}

async function main() {
  try {
    logInfo("Starting MCP server");

    const server = await createServer();
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
