import { z } from 'zod';

export const clientEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
    NEXT_PUBLIC_CAPTCHA_SITE_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    // Security Rule: NEXT_PUBLIC_ variables exposed to browser bundles must never contain secret keys
    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith('NEXT_PUBLIC_') && typeof val === 'string') {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('secret') ||
          lowerKey.includes('password') ||
          lowerKey.includes('private') ||
          lowerKey.includes('jwt')
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `CRITICAL LEAKAGE HAZARD: Client variable "${key}" contains sensitive keyword and must not be exposed to browser bundles.`,
            path: [key],
          });
        }
      }
    }
  });

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function validateClientEnv(env: Record<string, unknown> = process.env): ClientEnv {
  const result = clientEnvSchema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(`Client environment validation failed:\n${JSON.stringify(formatted, null, 2)}`);
  }
  return result.data;
}
