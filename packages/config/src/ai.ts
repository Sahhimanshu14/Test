import { z } from 'zod';

export const baseAiConfigSchema = z.object({
  ENABLE_AI: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  AI_PROVIDER: z.enum(['mock', 'openai', 'google', 'anthropic']).default('mock'),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(2000),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  AI_DAILY_USER_LIMIT: z.coerce.number().int().positive().default(50),
  AI_MONTHLY_USER_LIMIT: z.coerce.number().int().positive().default(500),
});

export const aiConfigSchema = baseAiConfigSchema.superRefine((data, ctx) => {
  if (data.ENABLE_AI) {
    if (data.AI_PROVIDER === 'openai' && !data.OPENAI_API_KEY && !data.AI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OPENAI_API_KEY (or AI_API_KEY) is required when AI_PROVIDER is openai and ENABLE_AI is true',
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
});

export type AIConfig = z.infer<typeof aiConfigSchema>;
