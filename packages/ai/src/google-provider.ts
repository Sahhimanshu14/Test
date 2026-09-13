import { AIMessage, AIOptions, AIProvider, AIResponse } from './provider.interface';

export interface GoogleProviderConfig {
  apiKey: string;
  defaultModel?: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseUrl?: string;
}

export class GoogleProvider implements AIProvider {
  readonly providerName = 'google';
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseUrl: string;

  constructor(config: GoogleProviderConfig) {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('GoogleProvider requires a valid non-empty apiKey');
    }
    this.apiKey = config.apiKey.trim();
    this.defaultModel = config.defaultModel || 'gemini-1.5-flash';
    this.timeoutMs = config.timeoutMs || 15000;
    this.maxRetries = config.maxRetries ?? 2;
    this.baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  }

  async generateText(messages: AIMessage[], options?: AIOptions): Promise<AIResponse> {
    const model = options?.model || this.defaultModel;
    const timeout = options?.timeoutMs || this.timeoutMs;
    const maxTokens = options?.maxTokens || 2000;
    const temperature = options?.temperature ?? 0.7;

    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const contents = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const generationConfig: Record<string, unknown> = {
      temperature,
      maxOutputTokens: maxTokens,
    };

    if (options?.responseFormat === 'json') {
      generationConfig.responseMimeType = 'application/json';
    }

    const payload: Record<string, unknown> = {
      contents,
      generationConfig,
    };

    if (systemMessage) {
      payload.system_instruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = 200 * Math.pow(2, attempt - 1) + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          const errorBody = await res.text().catch(() => '');
          let errorMessage = `Google Gemini API returned status ${res.status}`;
          try {
            const parsed = JSON.parse(errorBody);
            if (parsed.error?.message) {
              errorMessage += `: ${parsed.error.message}`;
            }
          } catch {
            if (errorBody) errorMessage += `: ${errorBody.slice(0, 100)}`;
          }

          if ((res.status === 429 || res.status >= 500) && attempt < this.maxRetries) {
            lastError = new Error(errorMessage);
            continue;
          }

          throw new Error(errorMessage);
        }

        const data = (await res.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            totalTokenCount?: number;
          };
        };

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const usage = data.usageMetadata;

        return {
          content,
          model,
          tokenCost: usage
            ? {
                promptTokens: usage.promptTokenCount || 0,
                completionTokens: usage.candidatesTokenCount || 0,
                totalTokens: usage.totalTokenCount || 0,
              }
            : undefined,
        };
      } catch (err: unknown) {
        clearTimeout(timer);
        const error = err as Error;
        if (error.name === 'AbortError') {
          lastError = new Error(`Google Gemini request timed out after ${timeout}ms`);
        } else {
          lastError = error;
        }

        if (attempt < this.maxRetries) {
          continue;
        }
      }
    }

    throw lastError || new Error('Google Gemini API request failed');
  }
}
