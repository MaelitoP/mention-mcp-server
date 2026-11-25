import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "../api-client.js";
import { logInfo } from "../logger.js";

export function registerGetAccountInfoTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "get_account_info",
    {
      title: "Get Account Info",
      description:
        "Get the current account's ID, its groups, and whether it can create advanced alerts (canCreateAdvancedAlert).",
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      const data = await apiClient.getAccountInfo();

      const filteredResponse = {
        accountId: data.account.id,
        canCreateAdvancedAlert: data.account.subscription.advanced_query_access,
        groups:
          data.account.groups?.map((group) => ({
            id: group.id,
            name: group.name,
          })) || [],
      };

      logInfo("Account info retrieved", { accountId: data.account.id });

      return {
        content: [{ type: "text", text: JSON.stringify(filteredResponse, null, 2) }],
      };
    }
  );
}
