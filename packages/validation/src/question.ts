import { z } from 'zod';
import { DifficultyLevel, QuestionStatus, QuestionType } from '@cdsprep/types';

export const QuestionOptionSchema = z.object({
  id: z.string().uuid().optional(),
  identifier: z.string().min(1, 'Identifier is required').max(10),
  optionText: z.string().min(1, 'Option text cannot be empty'),
  isCorrect: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
});

export const QuestionExplanationSchema = z.object({
  explanation: z.string().min(1, 'Explanation text cannot be empty'),
  keyConcept: z.string().max(255).optional().nullable(),
  trickFormula: z.string().optional().nullable(),
});

export const CreateQuestionBaseSchema = z.object({
  questionText: z.string().min(3, 'Question text must be at least 3 characters long'),
  subjectId: z.string().min(1, 'Invalid subject ID format'),
  chapterId: z.string().min(1, 'Invalid chapter ID format'),
  topicId: z.string().min(1, 'Invalid topic ID format'),
  subtopicId: z.string().min(1, 'Invalid subtopic ID format').optional().nullable(),
  questionType: z.nativeEnum(QuestionType).default(QuestionType.MCQ_SINGLE),
  marks: z.number().positive('Marks must be greater than 0').default(1.0),
  negativeMarks: z.number().min(0, 'Negative marks cannot be negative').default(0.33),
  difficulty: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.MEDIUM),
  status: z.nativeEnum(QuestionStatus).default(QuestionStatus.DRAFT),
  source: z.string().max(150).optional().nullable(),
  year: z.number().int().min(1950).max(2100).optional().nullable(),
  exam: z.string().max(100).optional().nullable(),
  language: z.string().max(10).default('en'),
  tags: z.array(z.string().min(1)).optional().default([]),
  options: z.array(QuestionOptionSchema).default([]),
  explanation: QuestionExplanationSchema.optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  createdById: z.string().min(1).optional().nullable(),
  reviewedById: z.string().min(1).optional().nullable(),
  verifiedAt: z.coerce.date().optional().nullable(),
});

export const CreateQuestionSchema = CreateQuestionBaseSchema.superRefine((data, ctx) => {
  // Quality control 1: Negative marks cannot exceed positive marks
  if (data.negativeMarks > data.marks) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['negativeMarks'],
      message: 'Negative marks cannot exceed total question marks',
    });
  }

  // Quality control 2: Option count for choice-based types
  const choiceTypes: QuestionType[] = [
    QuestionType.MCQ_SINGLE,
    QuestionType.MCQ_MULTIPLE,
    QuestionType.ASSERTION_REASON,
    QuestionType.STATEMENT_BASED,
    QuestionType.MATCHING,
    QuestionType.IMAGE_BASED,
  ];

  if (choiceTypes.includes(data.questionType)) {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: `${data.questionType} questions must contain at least 2 options`,
      });
    } else {
      // Quality control 3: Check correct answer presence
      const correctOptions = data.options.filter((opt) => opt.isCorrect);
      if (correctOptions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: 'At least one option must be marked as correct',
        });
      }
      if (
        (data.questionType === QuestionType.MCQ_SINGLE ||
          data.questionType === QuestionType.IMAGE_BASED) &&
        correctOptions.length > 1
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: 'Single-choice question must have exactly one correct option',
        });
      }
    }
  }

  // Quality control 4: Image-based question must specify an image URL in metadata or questionText
  if (data.questionType === QuestionType.IMAGE_BASED) {
    const hasImageUrl =
      data.metadata &&
      (typeof data.metadata.imageUrl === 'string' || typeof data.metadata.image === 'string');
    const hasMarkdownImg = /!\[.*?\]\(.*?\)/.test(data.questionText);
    if (!hasImageUrl && !hasMarkdownImg) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['metadata'],
        message: 'Image-based question must specify a valid imageUrl in metadata or embedded image in question text',
      });
    }
  }

  // Quality control 5: LaTeX equation balancing
  const checkBalancedDelimiters = (text: string, path: string[]) => {
    // Count unescaped $$ and $
    const doubleDollarCount = (text.match(/(?<!\\)\$\$/g) || []).length;
    if (doubleDollarCount % 2 !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: 'Malformed equation: unclosed display math delimiter "$$"',
      });
    }
    // Remove all $$ to count single $
    const textWithoutDouble = text.replace(/(?<!\\)\$\$/g, '');
    const singleDollarCount = (textWithoutDouble.match(/(?<!\\)\$/g) || []).length;
    if (singleDollarCount % 2 !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: 'Malformed equation: unclosed inline math delimiter "$"',
      });
    }
  };

  if (data.questionText) {
    checkBalancedDelimiters(data.questionText, ['questionText']);
  }
  if (data.explanation?.explanation) {
    checkBalancedDelimiters(data.explanation.explanation, ['explanation', 'explanation']);
  }

  // Quality control 6: Numerical questions must specify correct numerical answer
  if (data.questionType === QuestionType.NUMERICAL) {
    const hasOptionCorrect = data.options?.some((opt) => opt.isCorrect);
    const hasMetadataValue =
      data.metadata &&
      (data.metadata.correctValue !== undefined || data.metadata.numericalAnswer !== undefined);
    if (!hasOptionCorrect && !hasMetadataValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['metadata'],
        message: 'Numerical question must specify a correct numerical answer or option',
      });
    }
  }
});

export const UpdateQuestionSchema = CreateQuestionBaseSchema.partial();

export const UpdateQuestionStatusSchema = z.object({
  status: z.nativeEnum(QuestionStatus),
  reason: z.string().optional(),
});

export const BulkImportRowSchema = z
  .object({
    questionText: z.string().min(3, 'Question text must be at least 3 characters'),
    subject: z.string().min(1, 'Subject is required'),
    chapter: z.string().optional().nullable(),
    topic: z.string().min(1, 'Topic is required'),
    questionType: z.string().optional().default('MCQ_SINGLE'),
    difficulty: z.string().optional().default('MEDIUM'),
    marks: z.coerce.number().positive().optional().default(1.0),
    negativeMarks: z.coerce.number().min(0).optional().default(0.33),
    options: z
      .union([
        z.array(
          z.object({
            identifier: z.string(),
            optionText: z.string(),
            isCorrect: z.boolean().optional().default(false),
          }),
        ),
        z.string(),
      ])
      .optional(),
    correctAnswer: z.string().optional(),
    explanation: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    year: z.coerce.number().int().optional().nullable(),
    exam: z.string().optional().nullable(),
    language: z.string().optional().default('en'),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    status: z.string().optional().default('DRAFT'),
  })
  .passthrough();

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;
export type BulkImportRowInput = z.infer<typeof BulkImportRowSchema>;
