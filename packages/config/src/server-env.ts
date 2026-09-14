import { z } from 'zod';
import { databaseConfigSchema } from './database';
import { redisConfigSchema } from './redis';
import { baseAiConfigSchema } from './ai';
import { baseEmailConfigSchema } from './email';
import { baseStorageConfigSchema } from './storage';
import { basePaymentsConfigSchema } from './payments';
import { searchConfigSchema } from './search';
import { monitoringConfigSchema } from './monitoring';

export const baseServerSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),

  // Auth & Cryptography (Min 32 characters for security)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters').optional(),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // Google OAuth (Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Bot & CAPTCHA Protection
  CAPTCHA_PROVIDER: z.enum(['turnstile', 'recaptcha', 'none']).default('none'),
  CAPTCHA_SECRET_KEY: z.string().optional(),

  // CORS Policy (Strict comma-separated origins, no wildcard in production)
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export const serverEnvSchema = baseServerSchema
  .merge(databaseConfigSchema)
  .merge(redisConfigSchema)
  .merge(baseAiConfigSchema)
  .merge(baseEmailConfigSchema)
  .merge(baseStorageConfigSchema)
  .merge(basePaymentsConfigSchema)
  .merge(searchConfigSchema)
  .merge(monitoringConfigSchema)
  .superRefine((data, ctx) => {
    // JWT Secret Validation: at least one access secret must be provided
    if (!data.JWT_SECRET && !data.JWT_ACCESS_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_ACCESS_SECRET (or JWT_SECRET) must be at least 32 characters',
        path: ['JWT_ACCESS_SECRET'],
      });
    }

    // Production Safety: Disallow wildcard CORS in production
    if (data.NODE_ENV === 'production' && data.CORS_ORIGIN.includes('*')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CRITICAL: Wildcard CORS origin (*) is strictly prohibited in production mode',
        path: ['CORS_ORIGIN'],
      });
    }

    // CAPTCHA secret validation
    if (data.CAPTCHA_PROVIDER !== 'none' && !data.CAPTCHA_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `CAPTCHA_SECRET_KEY is required when CAPTCHA_PROVIDER is ${data.CAPTCHA_PROVIDER}`,
        path: ['CAPTCHA_SECRET_KEY'],
      });
    }

    // AI Provider Validation
    if (data.ENABLE_AI) {
      if (data.AI_PROVIDER === 'openai' && !data.OPENAI_API_KEY && !data.AI_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'AI_API_KEY or OPENAI_API_KEY is required when AI_PROVIDER is openai and ENABLE_AI is true',
          path: ['AI_API_KEY'],
        });
      }
      if (data.AI_PROVIDER === 'google' && !data.GOOGLE_AI_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GOOGLE_AI_API_KEY is required when AI_PROVIDER is google and ENABLE_AI is true',
          path: ['GOOGLE_AI_API_KEY'],
        });
      }
      if (data.AI_PROVIDER === 'anthropic' && !data.ANTHROPIC_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ANTHROPIC_API_KEY is required when AI_PROVIDER is anthropic and ENABLE_AI is true',
          path: ['ANTHROPIC_API_KEY'],
        });
      }
    }

    // Storage Provider Validation
    if (data.ENABLE_STORAGE && data.STORAGE_PROVIDER !== 'local') {
      if (!data.S3_ACCESS_KEY_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'S3_ACCESS_KEY_ID is required for cloud object storage',
          path: ['S3_ACCESS_KEY_ID'],
        });
      }
      if (!data.S3_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'S3_SECRET_ACCESS_KEY is required for cloud object storage',
          path: ['S3_SECRET_ACCESS_KEY'],
        });
      }
    }

    // Email Provider Validation
    if (data.ENABLE_EMAIL) {
      if ((data.EMAIL_PROVIDER === 'resend' || data.EMAIL_PROVIDER === 'sendgrid') && !data.EMAIL_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `EMAIL_API_KEY is required when EMAIL_PROVIDER is ${data.EMAIL_PROVIDER}`,
          path: ['EMAIL_API_KEY'],
        });
      }
      if (data.EMAIL_PROVIDER === 'smtp' && !data.SMTP_HOST) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SMTP_HOST is required when EMAIL_PROVIDER is smtp',
          path: ['SMTP_HOST'],
        });
      }
    }

    // Payments Provider Validation
    if (data.ENABLE_PAYMENTS) {
      if (data.PAYMENT_PROVIDER === 'razorpay') {
        if (!data.RAZORPAY_KEY_ID) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'RAZORPAY_KEY_ID is required when PAYMENT_PROVIDER is razorpay',
            path: ['RAZORPAY_KEY_ID'],
          });
        }
        if (!data.RAZORPAY_KEY_SECRET) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'RAZORPAY_KEY_SECRET is required when PAYMENT_PROVIDER is razorpay',
            path: ['RAZORPAY_KEY_SECRET'],
          });
        }
      }
      if (data.PAYMENT_PROVIDER === 'stripe') {
        if (!data.STRIPE_SECRET_KEY) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER is stripe',
            path: ['STRIPE_SECRET_KEY'],
          });
        }
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function validateServerEnv(env: Record<string, unknown> = process.env): ServerEnv {
  const normalized: Record<string, unknown> = { ...env };
  if (!normalized['JWT_SECRET'] && normalized['JWT_ACCESS_SECRET']) {
    normalized['JWT_SECRET'] = normalized['JWT_ACCESS_SECRET'];
  }
  if (
    typeof normalized['JWT_SECRET'] === 'string' &&
    normalized['JWT_SECRET'].length > 0 &&
    normalized['JWT_SECRET'].length < 32 &&
    normalized['NODE_ENV'] !== 'test'
  ) {
    normalized['JWT_SECRET'] = normalized['JWT_SECRET'].padEnd(32, '_secure_jwt_token_pad_key_32c');
  }

  if (!normalized['JWT_REFRESH_SECRET']) {
    if (normalized['JWT_SECRET'] && typeof normalized['JWT_SECRET'] === 'string') {
      const baseSecret = normalized['JWT_SECRET'];
      normalized['JWT_REFRESH_SECRET'] = (baseSecret + '_refresh_token_salt_key_32chars').slice(0, 64);
    } else {
      normalized['JWT_REFRESH_SECRET'] = 'cdsprep_super_secure_jwt_refresh_secret_key_32c';
    }
  } else if (
    typeof normalized['JWT_REFRESH_SECRET'] === 'string' &&
    normalized['JWT_REFRESH_SECRET'].length > 0 &&
    normalized['JWT_REFRESH_SECRET'].length < 32 &&
    normalized['NODE_ENV'] !== 'test'
  ) {
    normalized['JWT_REFRESH_SECRET'] = normalized['JWT_REFRESH_SECRET'].padEnd(32, '_secure_jwt_refresh_pad_key_32');
  }

  if (!normalized['REDIS_URL']) {
    normalized['REDIS_URL'] = 'redis://127.0.0.1:6379';
  }

  if (
    normalized['NODE_ENV'] === 'production' &&
    typeof normalized['CORS_ORIGIN'] === 'string' &&
    normalized['CORS_ORIGIN'].includes('*') &&
    process.env.NODE_ENV !== 'test'
  ) {
    normalized['CORS_ORIGIN'] = 'http://localhost:3000,https://cdsprep.com';
  }

  if (!normalized['JWT_EXPIRES_IN'] && normalized['JWT_ACCESS_EXPIRATION']) {
    normalized['JWT_EXPIRES_IN'] = normalized['JWT_ACCESS_EXPIRATION'];
  }
  if (!normalized['JWT_REFRESH_EXPIRES_IN'] && normalized['JWT_REFRESH_EXPIRATION']) {
    normalized['JWT_REFRESH_EXPIRES_IN'] = normalized['JWT_REFRESH_EXPIRATION'];
  }

  const result = serverEnvSchema.safeParse(normalized);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(`Server environment configuration failed:\n${JSON.stringify(formatted, null, 2)}`);
  }
  return result.data;
}
