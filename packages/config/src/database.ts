import { z } from 'zod';

export const databaseConfigSchema = z.object({
  DATABASE_URL: z.string({ required_error: 'DATABASE_URL is required' }).min(1, 'DATABASE_URL is required'),
  DATABASE_DIRECT_URL: z.string().optional(),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(25),
  DATABASE_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  DATABASE_SSL: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

/**
 * Sanitizes a PostgreSQL connection URI by redacting the password
 */
export function sanitizeDatabaseUrl(url?: string): string {
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
