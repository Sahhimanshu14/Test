import { AIMessage, AIOptions, AIProvider, AIResponse } from './provider.interface';

export interface OpenAIProviderConfig {
  apiKey: string;
  defaultModel?: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseUrl?: string;
}

export class OpenAIProvider implements AIProvider {
  readonly providerName = 'openai';
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseUrl: string;

  constructor(config: OpenAIProviderConfig) {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('OpenAIProvider requires a valid non-empty apiKey');
    }
    this.apiKey = config.apiKey.trim();
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
    this.timeoutMs = config.timeoutMs || 15000;
    this.maxRetries = config.maxRetries ?? 2;
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  }

  async generateText(messages: AIMessage[], options?: AIOptions): Promise<AIResponse> {
    const model = options?.model || this.defaultModel;
    const timeout = options?.timeoutMs || this.timeoutMs;
    const maxTokens = options?.maxTokens || 2000;
    const temperature = options?.temperature ?? 0.7;

    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const payload: Record<string, unknown> = {
      model,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens,
    };

    if (options?.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with jitter: 200ms * 2^(attempt - 1)
        const delay = 200 * Math.pow(2, attempt - 1) + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          const errorBody = await res.text().catch(() => '');
          let errorMessage = `OpenAI API returned status ${res.status}`;
          try {
            const parsed = JSON.parse(errorBody);
            if (parsed.error?.message) {
              errorMessage += `: ${parsed.error.message}`;
            }
          } catch {
            if (errorBody) errorMessage += `: ${errorBody.slice(0, 100)}`;
          }

          // If rate limited (429) or server error (5xx), allow retry
          if ((res.status === 429 || res.status >= 500) && attempt < this.maxRetries) {
            lastError = new Error(errorMessage);
            continue;
          }

          throw new Error(errorMessage);
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          model?: string;
        };

        const content = data.choices?.[0]?.message?.content || '';
        const usage = data.usage;

        return {
          content,
          model: data.model || model,
          tokenCost: usage
            ? {
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0,
                totalTokens: usage.total_tokens || 0,
              }
            : undefined,
        };
      } catch (err: unknown) {
        clearTimeout(timer);
        const error = err as Error;
        if (error.name === 'AbortError') {
          lastError = new Error(`OpenAI request timed out after ${timeout}ms`);
        } else {
          lastError = error;
        }

        if (attempt < this.maxRetries) {
          continue;
        }
      }
    }

    throw lastError || new Error('OpenAI API request failed');
  }
}
