import { EmailMessage, EmailProvider, SendEmailResult } from './provider.interface';

export interface ResendProviderConfig {
  apiKey: string;
  defaultFrom: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseUrl?: string;
}

export class ResendProvider implements EmailProvider {
  readonly providerName = 'resend';
  private readonly apiKey: string;
  private readonly defaultFrom: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseUrl: string;

  constructor(config: ResendProviderConfig) {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('ResendProvider requires a valid non-empty apiKey');
    }
    this.apiKey = config.apiKey.trim();
    this.defaultFrom = config.defaultFrom || 'notifications@cdsprep.com';
    this.timeoutMs = config.timeoutMs || 10000;
    this.maxRetries = config.maxRetries ?? 2;
    this.baseUrl = (config.baseUrl || 'https://api.resend.com').replace(/\/+$/, '');
  }

  async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    const to = Array.isArray(message.to) ? message.to : [message.to];
    const payload: Record<string, unknown> = {
      from: message.from || this.defaultFrom,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    };

    if (message.replyTo) {
      payload.reply_to = message.replyTo;
    }

    if (message.tags) {
      payload.tags = Object.entries(message.tags).map(([name, value]) => ({ name, value }));
    }

    let lastError = 'Unknown error sending email via Resend';

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = 200 * Math.pow(2, attempt - 1) + Math.random() * 50;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(`${this.baseUrl}/emails`, {
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
          const body = await res.text().catch(() => '');
          lastError = `Resend API returned status ${res.status}: ${body}`;
          if ((res.status === 429 || res.status >= 500) && attempt < this.maxRetries) {
            continue;
          }
          return {
            success: false,
            error: lastError,
          };
        }

        const data = (await res.json()) as { id?: string };
        return {
          id: data.id,
          success: true,
        };
      } catch (err: unknown) {
        clearTimeout(timer);
        const error = err as Error;
        lastError = error.name === 'AbortError'
          ? `Resend API delivery timed out after ${this.timeoutMs}ms`
          : error.message;

        if (attempt < this.maxRetries) {
          continue;
        }
      }
    }

    return {
      success: false,
      error: lastError,
    };
  }
}
