import { describe, it, expect } from 'vitest';
import { serverEnvSchema, clientEnvSchema } from '../src/env';

describe('Environment Validation', () => {
  it('validates a correct minimal server environment', () => {
    const validEnv = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cdsprep',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'this_is_a_very_long_secret_key_at_least_32_chars_12345',
      JWT_REFRESH_SECRET: 'this_is_another_very_long_secret_key_at_least_32_chars_67890',
    };

    const parsed = serverEnvSchema.safeParse(validEnv);
    expect(parsed.success).toBe(true);
  });

  it('fails if JWT secrets are shorter than 32 characters', () => {
    const invalidEnv = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cdsprep',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'short_secret',
      JWT_REFRESH_SECRET: 'short_secret',
    };

    const parsed = serverEnvSchema.safeParse(invalidEnv);
    expect(parsed.success).toBe(false);
  });

  it('enforces AI_API_KEY when ENABLE_AI is true and provider is openai', () => {
    const aiEnv = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cdsprep',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'this_is_a_very_long_secret_key_at_least_32_chars_12345',
      JWT_REFRESH_SECRET: 'this_is_another_very_long_secret_key_at_least_32_chars_67890',
      ENABLE_AI: 'true',
      AI_PROVIDER: 'openai',
      // Missing AI_API_KEY
    };

    const parsed = serverEnvSchema.safeParse(aiEnv);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.includes('AI_API_KEY'));
      expect(issue).toBeDefined();
    }
  });

  it('validates client environment URLs', () => {
    const clientEnv = {
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
    };

    const parsed = clientEnvSchema.safeParse(clientEnv);
    expect(parsed.success).toBe(true);
  });
});
