import { z } from 'zod';

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

export const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.dll',
  '.bat',
  '.cmd',
  '.sh',
  '.bash',
  '.php',
  '.phtml',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.html',
  '.htm',
  '.svg',
  '.py',
  '.vbs',
  '.jar',
  '.msi',
  '.scr',
  '.com',
];

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const registerUploadSchema = z
  .object({
    originalName: z
      .string()
      .min(1, 'Original file name is required')
      .max(255, 'Original file name exceeds 255 characters'),
    mimeType: z.enum(ALLOWED_UPLOAD_MIME_TYPES, {
      errorMap: () => ({ message: 'File MIME type is not permitted' }),
    }),
    sizeBytes: z
      .number()
      .int('File size must be an integer')
      .positive('File size must be greater than zero')
      .max(MAX_UPLOAD_SIZE_BYTES, 'File exceeds the maximum permitted size of 10MB'),
  })
  .superRefine((data, ctx) => {
    const extMatch = data.originalName.match(/\.([a-zA-Z0-9]+)$/);
    if (!extMatch || !extMatch[1]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['originalName'],
        message: 'File must have a valid file extension',
      });
      return;
    }
    const rawExt = extMatch[1];

    const ext = `.${rawExt.toLowerCase()}`;
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['originalName'],
        message: `Executable or script extension "${ext}" is strictly disallowed`,
      });
      return;
    }

    const validExts: string[] = MIME_TO_EXTENSIONS[data.mimeType] || [];
    if (!validExts.includes(ext)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['originalName'],
        message: `Extension "${ext}" does not match declared MIME type "${data.mimeType}" (allowed: ${validExts.join(', ')})`,
      });
    }
  });

export type RegisterUploadInput = z.infer<typeof registerUploadSchema>;
