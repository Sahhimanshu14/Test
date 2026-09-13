import { z } from 'zod';

export const baseStorageConfigSchema = z.object({
  ENABLE_STORAGE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  STORAGE_PROVIDER: z.enum(['local', 's3', 'r2', 'supabase', 'minio']).default('local'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string().default('cdsprep-assets'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_CDN_URL: z.string().optional(),
  MAX_UPLOAD_SIZE_BYTES: z.coerce.number().int().positive().default(15 * 1024 * 1024), // 15MB
});

export const storageConfigSchema = baseStorageConfigSchema.superRefine((data, ctx) => {
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
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;
