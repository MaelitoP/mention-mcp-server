import type { MentionAPIClient } from "../api-client.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolHandler {
  handle(args: unknown): Promise<{
    content: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

export interface Tool {
  getDefinition(): ToolDefinition;
  createHandler(apiClient: MentionAPIClient): ToolHandler;
}
