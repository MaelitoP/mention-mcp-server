import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBuildBooleanQueryPrompt } from "./build-boolean-query.js";

export function registerPrompts(server: McpServer) {
  registerBuildBooleanQueryPrompt(server);
}
