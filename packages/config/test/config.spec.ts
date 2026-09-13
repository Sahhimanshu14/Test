import { describe, it, expect } from 'vitest';
import {
  validateServerEnv,
  validateClientEnv,
  sanitizeDatabaseUrl,
  sanitizeRedisUrl,
  getSanitizedConfigReport,
} from '../src';

describe('Central Configuration & Environment System', () => {
  it('validates minimal valid server environment with sensible defaults', () => {
    const config = validateServerEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://cadet:secret_pwd@localhost:5432/cdsprep_test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-secret-at-least-32-characters-long-key',
      JWT_REFRESH_SECRET: 'test-refresh-at-least-32-characters-long-key',
    });

    expect(config.NODE_ENV).toBe('test');
    expect(config.PORT).toBe(4000);
    expect(config.AI_PROVIDER).toBe('mock');
    expect(config.EMAIL_PROVIDER).toBe('mock');
    expect(config.STORAGE_PROVIDER).toBe('local');
    expect(config.PAYMENT_PROVIDER).toBe('mock');
  });

  it('rejects missing DATABASE_URL with descriptive error', () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: 'test',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-secret-at-least-32-characters-long-key',
        JWT_REFRESH_SECRET: 'test-refresh-at-least-32-characters-long-key',
      }),
    ).toThrowError(/DATABASE_URL is required/);
  });

  it('rejects short JWT secrets for security', () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://cadet:pwd@localhost:5432/cdsprep',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'short_key',
        JWT_REFRESH_SECRET: 'short_key',
      }),
    ).toThrowError(/JWT_SECRET must be at least 32 characters/);
  });

  it('rejects wildcard CORS in production mode', () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://cadet:pwd@localhost:5432/cdsprep',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'prod-secret-at-least-32-characters-long-key',
        JWT_REFRESH_SECRET: 'prod-refresh-at-least-32-characters-long-key',
        CORS_ORIGIN: '*',
      }),
    ).toThrowError(/Wildcard CORS origin \(\*\) is strictly prohibited in production mode/);
  });

  it('requires OPENAI_API_KEY when ENABLE_AI is true and provider is openai', () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://cadet:pwd@localhost:5432/cdsprep',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-secret-at-least-32-characters-long-key',
        JWT_REFRESH_SECRET: 'test-refresh-at-least-32-characters-long-key',
        ENABLE_AI: 'true',
        AI_PROVIDER: 'openai',
      }),
    ).toThrowError(/OPENAI_API_KEY is required/);
  });

  it('sanitizes sensitive passwords in database and redis URLs', () => {
    const rawPg = 'postgresql://admin:super_secret_password_123@db.prod.internal:5432/cdsprep';
    const sanitizedPg = sanitizeDatabaseUrl(rawPg);
    expect(sanitizedPg).not.toContain('super_secret_password_123');
    expect(sanitizedPg).toContain('******');

    const rawRedis = 'redis://:redis_secret_token_abc@redis.prod.internal:6379';
    const sanitizedRedis = sanitizeRedisUrl(rawRedis);
    expect(sanitizedRedis).not.toContain('redis_secret_token_abc');
    expect(sanitizedRedis).toContain('******');
  });

  it('generates a clean, secret-free config status report', () => {
    const config = validateServerEnv({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://admin:pwd@localhost:5432/cdsprep',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'dev-secret-at-least-32-characters-long-key',
      JWT_REFRESH_SECRET: 'dev-refresh-at-least-32-characters-long-key',
    });

    const report = getSanitizedConfigReport(config);
    expect(report.length).toBeGreaterThan(5);

    const reportJson = JSON.stringify(report);
    expect(reportJson).not.toContain('pwd');
    expect(reportJson).not.toContain('dev-secret');
    expect(reportJson).toContain('PostgreSQL');
    expect(reportJson).toContain('Redis');
  });

  it('protects client bundles from accidental secret leakage in NEXT_PUBLIC variables', () => {
    expect(() =>
      validateClientEnv({
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
        NEXT_PUBLIC_SECRET_KEY: 'accidental_leak_token',
      }),
    ).toThrowError(/contains sensitive keyword and must not be exposed to browser bundles/);
  });
});
