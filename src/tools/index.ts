import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "../api-client.js";
import { registerCreateAdvancedAlertTool } from "./create_advanced_alert.js";
import { registerCreateBasicAlertTool } from "./create_basic_alert.js";
import { registerFetchAlertStatsTool } from "./fetch_alert_stats.js";
import { registerGetAccountInfoTool } from "./get_account_info.js";
import { registerGetAlertTool } from "./get_alert.js";
import { registerGetAppDataTool } from "./get_app_data.js";
import { registerListAlertsTool } from "./list_alerts.js";
import { registerPauseAlertTool } from "./pause_alert.js";
import { registerSearchMentionsTool } from "./search_mentions.js";
import { registerUnpauseAlertTool } from "./unpause_alert.js";
import { registerUpdateAlertTool } from "./update_alert.js";

export function registerTools(server: McpServer, apiClient: MentionAPIClient, readOnly: boolean) {
  registerGetAccountInfoTool(server, apiClient);
  registerGetAppDataTool(server, apiClient);
  registerListAlertsTool(server, apiClient);
  registerGetAlertTool(server, apiClient);
  if (!readOnly) {
    registerCreateBasicAlertTool(server, apiClient);
    registerCreateAdvancedAlertTool(server, apiClient);
    registerUpdateAlertTool(server, apiClient);
    registerPauseAlertTool(server, apiClient);
    registerUnpauseAlertTool(server, apiClient);
  }
  registerSearchMentionsTool(server, apiClient);
  registerFetchAlertStatsTool(server, apiClient);
}
