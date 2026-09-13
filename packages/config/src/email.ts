import { z } from 'zod';

export const baseEmailConfigSchema = z.object({
  ENABLE_EMAIL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  EMAIL_PROVIDER: z.enum(['mock', 'resend', 'sendgrid', 'ses', 'smtp']).default('mock'),
  EMAIL_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  EMAIL_FROM: z.string().default('CDSPrep Support <support@cdsprep.com>'),
  EMAIL_REPLY_TO: z.string().optional(),
});

export const emailConfigSchema = baseEmailConfigSchema.superRefine((data, ctx) => {
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
});

export type EmailConfig = z.infer<typeof emailConfigSchema>;
