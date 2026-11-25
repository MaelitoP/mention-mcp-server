import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "./api-client.js";
import { registerPrompts } from "./prompts/index.js";
import { registerTools } from "./tools/index.js";

export function createServer(apiClient: MentionAPIClient, version: string): McpServer {
  const server = new McpServer({ name: "mention-mcp-server", version });
  registerTools(server, apiClient);
  registerPrompts(server);
  return server;
}
