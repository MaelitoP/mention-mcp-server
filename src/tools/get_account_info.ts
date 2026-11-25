import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MentionAPIClient } from "../api-client.js";
import { logInfo } from "../logger.js";

export function registerGetAccountInfoTool(server: McpServer, apiClient: MentionAPIClient) {
  server.registerTool(
    "get_account_info",
    {
      description:
        "Get current account information including subscription plan, account ID, and capabilities. This tool should be called first to understand account limitations and determine which alert creation tools are available.",
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
