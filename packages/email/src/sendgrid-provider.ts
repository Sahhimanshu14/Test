import { EmailMessage, EmailProvider, SendEmailResult } from './provider.interface';

export interface SendGridProviderConfig {
  apiKey: string;
  defaultFrom: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseUrl?: string;
}

export class SendGridProvider implements EmailProvider {
  readonly providerName = 'sendgrid';
  private readonly apiKey: string;
  private readonly defaultFrom: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseUrl: string;

  constructor(config: SendGridProviderConfig) {
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('SendGridProvider requires a valid non-empty apiKey');
    }
    this.apiKey = config.apiKey.trim();
    this.defaultFrom = config.defaultFrom || 'notifications@cdsprep.com';
    this.timeoutMs = config.timeoutMs || 10000;
    this.maxRetries = config.maxRetries ?? 2;
    this.baseUrl = (config.baseUrl || 'https://api.sendgrid.com/v3').replace(/\/+$/, '');
  }

  async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const payload: Record<string, unknown> = {
      personalizations: [
        {
          to: recipients.map((email) => ({ email })),
        },
      ],
      from: { email: message.from || this.defaultFrom },
      subject: message.subject,
      content: [
        { type: 'text/plain', value: message.text },
        { type: 'text/html', value: message.html },
      ],
    };

    if (message.replyTo) {
      payload.reply_to = { email: message.replyTo };
    }

    let lastError = 'Unknown error delivering via SendGrid';

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = 200 * Math.pow(2, attempt - 1) + Math.random() * 50;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(`${this.baseUrl}/mail/send`, {
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
          lastError = `SendGrid returned status ${res.status}: ${body}`;
          if ((res.status === 429 || res.status >= 500) && attempt < this.maxRetries) {
            continue;
          }
          return {
            success: false,
            error: lastError,
          };
        }

        const messageId = res.headers.get('x-message-id') || `sg-${Date.now()}`;
        return {
          id: messageId,
          success: true,
        };
      } catch (err: unknown) {
        clearTimeout(timer);
        const error = err as Error;
        lastError = error.name === 'AbortError'
          ? `SendGrid delivery timed out after ${this.timeoutMs}ms`
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
