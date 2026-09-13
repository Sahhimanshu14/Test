import { z } from 'zod';
import { PracticeMode, DifficultyLevel } from '@cdsprep/types';

export const CreatePracticeSessionSchema = z.object({
  mode: z.nativeEnum(PracticeMode).default(PracticeMode.ALL_QUESTIONS),
  subjectId: z.string().uuid('Invalid subject ID format').optional().nullable(),
  chapterId: z.string().uuid('Invalid chapter ID format').optional().nullable(),
  topicId: z.string().uuid('Invalid topic ID format').optional().nullable(),
  difficulty: z.nativeEnum(DifficultyLevel).optional().nullable(),
  questionCount: z.number().int().min(1, 'At least 1 question is required').max(100, 'Maximum 100 questions per session').default(10),
  randomize: z.boolean().default(true),
  timeLimitMinutes: z.number().int().min(1).max(360).optional().nullable(),
  enableNegativeMarking: z.boolean().default(false),
});

export type CreatePracticeSessionInput = z.infer<typeof CreatePracticeSessionSchema>;

export const SubmitPracticeAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID format'),
  selectedOptionId: z.string().uuid('Invalid option ID format').nullable().optional(),
  timeSpentSeconds: z.number().int().min(0).default(0),
  isMarkedForReview: z.boolean().default(false),
});

export type SubmitPracticeAnswerInput = z.infer<typeof SubmitPracticeAnswerSchema>;

export const CreateQuestionReportSchema = z.object({
  questionId: z.string().uuid('Invalid question ID format'),
  reason: z.string().min(2, 'Reason is required').max(100, 'Reason too long'),
  details: z.string().max(1000, 'Details too long').optional().nullable(),
});

export type CreateQuestionReportInput = z.infer<typeof CreateQuestionReportSchema>;
