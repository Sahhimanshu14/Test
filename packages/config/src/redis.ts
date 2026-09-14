import { z } from 'zod';

export const redisConfigSchema = z.object({
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type RedisConfig = z.infer<typeof redisConfigSchema>;

/**
 * Sanitizes a Redis connection URI by redacting the password
 */
export function sanitizeRedisUrl(url?: string): string {
  if (!url) return '[NOT_CONFIGURED]';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '******';
    }
    return parsed.toString();
  } catch {
    return url.replace(/(:)([^@/]+)(@)/, '$1******$3');
  }
}
