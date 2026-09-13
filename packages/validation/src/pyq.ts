import { z } from 'zod';

export const PYQLicenseMetadataSchema = z.object({
  licenseType: z.string().min(1, 'License type is required'),
  attribution: z.string().min(1, 'Attribution is required'),
  sourceUrl: z.string().url().optional().nullable(),
  rightsHolder: z.string().optional().nullable(),
  isPublicDomain: z.boolean().default(true),
  importedBy: z.string().optional().nullable(),
  verifiedAt: z.string().optional().nullable(),
});

export const CreatePYQPaperBaseSchema = z.object({
  year: z.coerce.number().int().min(2000, 'Year must be 2000 or later').max(2100, 'Invalid year'),
  session: z.string().min(1, 'Session is required (e.g. I, II)').max(10),
  exam: z.string().min(1).max(50).default('CDS'),
  subjectSlug: z.string().min(1, 'Subject slug is required').max(50),
  subjectId: z.string().uuid('Invalid subject ID format').optional().nullable(),
  title: z.string().min(3, 'Title must be at least 3 characters long').max(150),
  totalMarks: z.coerce.number().positive('Total marks must be positive').default(100.0),
  durationMin: z.coerce.number().int().positive('Duration must be positive').default(120),
  source: z.string().min(1, 'Source metadata is legally required for attribution').max(200),
  sourceUrl: z.string().url().optional().nullable(),
  licenseType: z
    .string()
    .min(1, 'License type is required')
    .default('PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS'),
  attribution: z
    .string()
    .min(1, 'Legal attribution statement is required for copyright compliance'),
  licenseMetadata: z.record(z.any()).optional().nullable(),
  isPublished: z.boolean().default(false),
});

export const CreatePYQPaperSchema = CreatePYQPaperBaseSchema;

export const UpdatePYQPaperSchema = CreatePYQPaperBaseSchema.partial();

export const MapPYQQuestionItemSchema = z.object({
  questionId: z.string().uuid('Invalid question ID format'),
  questionNumber: z.number().int().positive('Question number must be positive'),
});

export const MapPYQQuestionsSchema = z
  .object({
    questions: z.array(MapPYQQuestionItemSchema).min(1, 'Must map at least one question'),
  })
  .superRefine((data, ctx) => {
    // Quality control 1: Check unique questionNumbers
    const seenNumbers = new Set<number>();
    for (const q of data.questions) {
      if (seenNumbers.has(q.questionNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions'],
          message: `Duplicate question number detected: ${q.questionNumber}`,
        });
      }
      seenNumbers.add(q.questionNumber);
    }

    // Quality control 2: Check unique questionIds
    const seenQuestionIds = new Set<string>();
    for (const q of data.questions) {
      if (seenQuestionIds.has(q.questionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions'],
          message: `Duplicate question mapping detected: ${q.questionId}`,
        });
      }
      seenQuestionIds.add(q.questionId);
    }
  });

export const BulkImportPYQSchema = z.object({
  paper: CreatePYQPaperSchema,
  questions: z.array(z.record(z.any())).min(1, 'Paper must contain at least 1 question'),
});

export type CreatePYQPaperInput = z.infer<typeof CreatePYQPaperSchema>;
export type UpdatePYQPaperInput = z.infer<typeof UpdatePYQPaperSchema>;
export type MapPYQQuestionsInput = z.infer<typeof MapPYQQuestionsSchema>;
export type BulkImportPYQInput = z.infer<typeof BulkImportPYQSchema>;
