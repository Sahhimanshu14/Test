import { EmailProvider } from './provider.interface';
import { MockEmailProvider, MockEmailProviderConfig } from './mock-provider';
import { ResendProvider, ResendProviderConfig } from './resend-provider';
import { SendGridProvider, SendGridProviderConfig } from './sendgrid-provider';

export interface EmailFactoryConfig {
  provider?: 'resend' | 'sendgrid' | 'mock' | 'smtp' | string;
  apiKey?: string;
  defaultFrom?: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseUrl?: string;
  mockConfig?: MockEmailProviderConfig;
}

export function getEmailProvider(config?: EmailFactoryConfig): EmailProvider {
  const providerType = (config?.provider || 'mock').toLowerCase();

  switch (providerType) {
    case 'resend': {
      if (!config?.apiKey) {
        throw new Error('Resend email provider configured but EMAIL_API_KEY is missing');
      }
      return new ResendProvider({
        apiKey: config.apiKey,
        defaultFrom: config.defaultFrom || 'notifications@cdsprep.com',
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        baseUrl: config.baseUrl,
      });
    }

    case 'sendgrid': {
      if (!config?.apiKey) {
        throw new Error('SendGrid email provider configured but EMAIL_API_KEY is missing');
      }
      return new SendGridProvider({
        apiKey: config.apiKey,
        defaultFrom: config.defaultFrom || 'notifications@cdsprep.com',
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        baseUrl: config.baseUrl,
      });
    }

    case 'mock':
    default:
      return new MockEmailProvider(config?.mockConfig);
  }
}
