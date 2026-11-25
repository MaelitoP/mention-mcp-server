import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "./api-client.js";
import { registerPrompts } from "./prompts/index.js";
import { registerTools } from "./tools/index.js";

const alertAuthoringInstructions = [
  "Call get_account_info first. Its groups give the group_id that create_basic_alert and create_advanced_alert require, and canCreateAdvancedAlert says whether the account can use create_advanced_alert; when it is false, use create_basic_alert.",
  "get_app_data lists the language and source codes that alerts accept, and the country codes that update_alert accepts.",
];

const listAlertsInstruction =
  "list_alerts returns the alert IDs that the other alert, mention and stats tools take.";

export function createServer(
  apiClient: MentionAPIClient,
  version: string,
  { readOnly }: { readOnly: boolean }
): McpServer {
  const instructions = readOnly
    ? listAlertsInstruction
    : [...alertAuthoringInstructions, listAlertsInstruction].join("\n");
  const server = new McpServer({ name: "mention-mcp-server", version }, { instructions });
  registerTools(server, apiClient, readOnly);
  registerPrompts(server);
  return server;
}
