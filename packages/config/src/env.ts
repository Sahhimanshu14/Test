import { ServerEnv, validateServerEnv } from './server-env';
import { ClientEnv, validateClientEnv } from './client-env';

export interface IntegrationStatus {
  service: string;
  provider: string;
  status: 'CONFIGURED' | 'DISABLED' | 'MISSING_CONFIG' | 'MOCK_MODE';
  details?: Record<string, string | number | boolean | undefined>;
}

export function getSanitizedConfigReport(env: ServerEnv): IntegrationStatus[] {
  const isProd = env.NODE_ENV === 'production';

  return [
    {
      service: 'PostgreSQL Database',
      provider: 'PostgreSQL',
      status: env.DATABASE_URL ? 'CONFIGURED' : 'MISSING_CONFIG',
      details: {
        poolSize: env.DATABASE_POOL_SIZE,
        ssl: Boolean(env.DATABASE_SSL),
      },
    },
    {
      service: 'Redis Cache & Queues',
      provider: 'Redis',
      status: env.REDIS_URL ? 'CONFIGURED' : 'MISSING_CONFIG',
      details: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        tls: Boolean(env.REDIS_TLS),
        authConfigured: Boolean(env.REDIS_PASSWORD),
      },
    },
    {
      service: 'AI Conceptual Tutor',
      provider: env.AI_PROVIDER,
      status: !env.ENABLE_AI
        ? 'DISABLED'
        : env.AI_PROVIDER === 'mock'
          ? 'MOCK_MODE'
          : (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) ||
              (env.AI_PROVIDER === 'google' && env.GOOGLE_AI_API_KEY) ||
              (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY)
            ? 'CONFIGURED'
            : 'MISSING_CONFIG',
      details: {
        model: env.AI_MODEL,
        maxTokens: env.AI_MAX_TOKENS,
        dailyLimit: env.AI_DAILY_USER_LIMIT,
      },
    },
    {
      service: 'Transactional Email',
      provider: env.EMAIL_PROVIDER,
      status: !env.ENABLE_EMAIL
        ? 'DISABLED'
        : env.EMAIL_PROVIDER === 'mock'
          ? 'MOCK_MODE'
          : (env.EMAIL_PROVIDER === 'resend' || env.EMAIL_PROVIDER === 'sendgrid') && env.EMAIL_API_KEY
            ? 'CONFIGURED'
            : env.EMAIL_PROVIDER === 'smtp' && env.SMTP_HOST
              ? 'CONFIGURED'
              : 'MISSING_CONFIG',
      details: {
        from: env.EMAIL_FROM,
        smtpHost: env.SMTP_HOST || 'none',
      },
    },
    {
      service: 'Object Storage',
      provider: env.STORAGE_PROVIDER,
      status: !env.ENABLE_STORAGE
        ? 'DISABLED'
        : env.STORAGE_PROVIDER === 'local'
          ? 'MOCK_MODE'
          : env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
            ? 'CONFIGURED'
            : 'MISSING_CONFIG',
      details: {
        bucket: env.S3_BUCKET,
        region: env.S3_REGION,
        maxUploadMB: Math.round(env.MAX_UPLOAD_SIZE_BYTES / 1024 / 1024),
      },
    },
    {
      service: 'Payment Gateway',
      provider: env.PAYMENT_PROVIDER,
      status: !env.ENABLE_PAYMENTS
        ? 'DISABLED'
        : env.PAYMENT_PROVIDER === 'mock'
          ? 'MOCK_MODE'
          : env.PAYMENT_PROVIDER === 'razorpay' && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
            ? 'CONFIGURED'
            : env.PAYMENT_PROVIDER === 'stripe' && env.STRIPE_SECRET_KEY
              ? 'CONFIGURED'
              : 'MISSING_CONFIG',
      details: {
        currency: env.PAYMENT_CURRENCY,
        webhookConfigured: Boolean(env.RAZORPAY_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET),
      },
    },
    {
      service: 'Search Engine',
      provider: env.SEARCH_PROVIDER,
      status: 'CONFIGURED',
      details: {
        pageSize: env.SEARCH_PAGE_SIZE,
      },
    },
    {
      service: 'Error Monitoring',
      provider: 'Sentry',
      status: env.SENTRY_DSN ? 'CONFIGURED' : isProd ? 'MISSING_CONFIG' : 'DISABLED',
      details: {
        environment: env.SENTRY_ENVIRONMENT,
        release: env.SENTRY_RELEASE,
      },
    },
    {
      service: 'Bot Protection (CAPTCHA)',
      provider: env.CAPTCHA_PROVIDER,
      status: env.CAPTCHA_PROVIDER === 'none' ? 'DISABLED' : env.CAPTCHA_SECRET_KEY ? 'CONFIGURED' : 'MISSING_CONFIG',
    },
    {
      service: 'Google OAuth',
      provider: 'Google',
      status: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'CONFIGURED' : 'DISABLED',
    },
  ];
}

export { validateServerEnv, validateClientEnv };
