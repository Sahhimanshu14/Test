import { z } from 'zod';

export const basePaymentsConfigSchema = z.object({
  ENABLE_PAYMENTS: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay', 'stripe']).default('mock'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_CURRENCY: z.string().default('INR'),
});

export const paymentsConfigSchema = basePaymentsConfigSchema.superRefine((data, ctx) => {
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

export type PaymentsConfig = z.infer<typeof paymentsConfigSchema>;
