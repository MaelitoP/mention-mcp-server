import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import type { ToolHandler } from "./base.js";

import { createAdvancedAlertTool } from "./create_advanced_alert.js";
import { createBasicAlertTool } from "./create_basic_alert.js";
import { getAccountInfoTool } from "./get_account_info.js";
import { getAlertTool } from "./get_alert.js";
import { getAppDataTool } from "./get_app_data.js";
import { listAlertsTool } from "./list_alerts.js";
import { pauseAlertTool } from "./pause_alert.js";
import { unpauseAlertTool } from "./unpause_alert.js";
import { updateAlertTool } from "./update_alert.js";

const tools = [
  getAccountInfoTool,
  getAppDataTool,
  listAlertsTool,
  getAlertTool,
  createBasicAlertTool,
  createAdvancedAlertTool,
  updateAlertTool,
  pauseAlertTool,
  unpauseAlertTool,
];

export function getToolDefinitions() {
  return tools.map((tool) => tool.getDefinition());
}

export class ToolHandlers {
  private handlers: Map<string, ToolHandler>;

  constructor(private apiClient: MentionAPIClient) {
    this.handlers = new Map();

    for (const tool of tools) {
      const handler = tool.createHandler(apiClient);
      this.handlers.set(tool.getDefinition().name, handler);
    }
  }

  async handleTool(name: string, args: unknown) {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    logInfo("Tool call started", { tool: name });
    try {
      const result = await handler.handle(args);
      logInfo("Tool call completed", { tool: name });
      return result;
    } catch (error) {
      logError("Tool call failed", error, { tool: name, args });
      throw error;
    }
  }
}
