import { z } from 'zod';

export const monitoringConfigSchema = z.object({
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_RELEASE: z.string().default('1.0.0'),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

export type MonitoringConfig = z.infer<typeof monitoringConfigSchema>;
