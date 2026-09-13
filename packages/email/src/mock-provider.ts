import { EmailMessage, EmailProvider, SendEmailResult } from './provider.interface';

export interface MockEmailProviderConfig {
  simulateFailure?: boolean;
  customErrorMessage?: string;
  defaultFrom?: string;
}

export class MockEmailProvider implements EmailProvider {
  readonly providerName = 'mock';
  public sentEmails: EmailMessage[] = [];
  private readonly defaultFrom: string;

  constructor(private readonly config: MockEmailProviderConfig = {}) {
    this.defaultFrom = config.defaultFrom || 'notifications@cdsprep.local';
  }

  async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    if (this.config.simulateFailure) {
      return {
        success: false,
        error: this.config.customErrorMessage || 'MockEmailProvider simulated delivery failure',
      };
    }

    const emailToSend: EmailMessage = {
      ...message,
      from: message.from || this.defaultFrom,
    };

    this.sentEmails.push(emailToSend);

    return {
      id: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      success: true,
    };
  }

  getLastSentEmail(): EmailMessage | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  findSentTo(recipient: string): EmailMessage[] {
    return this.sentEmails.filter((m) =>
      Array.isArray(m.to) ? m.to.includes(recipient) : m.to === recipient,
    );
  }

  clear(): void {
    this.sentEmails = [];
  }
}
