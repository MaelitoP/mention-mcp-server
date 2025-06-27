export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export interface PromptHandler {
  handle(args: unknown): Promise<{
    messages: Array<{
      role: string;
      content: {
        type: string;
        text: string;
      };
    }>;
  }>;
}

export interface Prompt {
  getDefinition(): PromptDefinition;
  createHandler(): PromptHandler;
}
