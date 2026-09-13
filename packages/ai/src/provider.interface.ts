export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  responseFormat?: 'text' | 'json';
  timeoutMs?: number;
}

export interface AIResponse {
  content: string;
  tokenCost?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface AIProvider {
  readonly providerName: string;
  generateText(messages: AIMessage[], options?: AIOptions): Promise<AIResponse>;
  streamText?(messages: AIMessage[], options?: AIOptions): AsyncIterable<string>;
}
