import type { MentionAPIClient } from "../api-client.js";
import { logError, logInfo } from "../logger.js";
import type { Tool, ToolDefinition, ToolHandler } from "./base.js";

function createGetAccountInfoHandler(apiClient: MentionAPIClient): ToolHandler {
  return {
    async handle(): Promise<{
      content: Array<{
        type: string;
        text: string;
      }>;
    }> {
      try {
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
          content: [
            {
              type: "text",
              text: JSON.stringify(filteredResponse, null, 2),
            },
          ],
        };
      } catch (error) {
        logError("Failed to get account info", error);
        throw error;
      }
    },
  };
}

export const getAccountInfoTool: Tool = {
  getDefinition(): ToolDefinition {
    return {
      name: "get_account_info",
      description:
        "Get current account information including subscription plan, account ID, and capabilities. This tool should be called first to understand account limitations and determine which alert creation tools are available.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    };
  },
  createHandler: createGetAccountInfoHandler,
};
