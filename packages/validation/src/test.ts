import { z } from 'zod';
import {
  QuestionPaletteState,
  TestType,
  AcademyTarget,
  DifficultyLevel,
  IntegrityEventType,
} from '@cdsprep/types';

export const createAttemptSchema = z.object({
  testId: z.string().uuid('Invalid test ID'),
  sessionToken: z.string().optional(),
});

export const autosaveAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  selectedOptionId: z.string().uuid('Invalid option ID').nullable().optional(),
  timeSpentSeconds: z.number().int().nonnegative().default(0),
  paletteState: z.nativeEnum(QuestionPaletteState).default(QuestionPaletteState.ANSWERED),
});

export const submitAttemptSchema = z.object({
  timeSpentSeconds: z.number().int().nonnegative().default(0),
  antiCheatEvents: z
    .array(
      z.object({
        event: z.string(),
        timestamp: z.string(),
      }),
    )
    .optional(),
});

export const logIntegrityEventSchema = z.object({
  eventType: z.nativeEnum(IntegrityEventType),
  timestamp: z.string().optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const createTestSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(200),
  description: z.string().optional().nullable(),
  testType: z.nativeEnum(TestType).default(TestType.FULL_MOCK),
  subjectId: z.string().uuid().optional().nullable(),
  chapterId: z.string().uuid().optional().nullable(),
  topicId: z.string().uuid().optional().nullable(),
  targetAcademy: z.nativeEnum(AcademyTarget).default(AcademyTarget.IMA),
  durationMinutes: z.number().int().min(1).max(360).default(120),
  totalMarks: z.number().positive().default(100),
  passingMarks: z.number().nonnegative().optional().nullable(),
  negativeMarks: z.number().nonnegative().default(0.33),
  randomize: z.boolean().default(false),
  questionCount: z.number().int().positive().optional().nullable(),
  difficulty: z.nativeEnum(DifficultyLevel).optional().nullable(),
  instructions: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
});

export const updateTestSchema = createTestSchema.partial();

export const createTestSectionSchema = z.object({
  name: z.string().min(1).max(100),
  orderIndex: z.number().int().min(0).default(0),
  durationMinutes: z.number().int().positive().optional().nullable(),
});

export const assignTestQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
export type AutosaveAnswerInput = z.infer<typeof autosaveAnswerSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
export type LogIntegrityEventInput = z.infer<typeof logIntegrityEventSchema>;
export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type CreateTestSectionInput = z.infer<typeof createTestSectionSchema>;
export type AssignTestQuestionsInput = z.infer<typeof assignTestQuestionsSchema>;
