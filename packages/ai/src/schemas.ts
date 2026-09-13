import { z } from 'zod';

export const ExplanationModeEnum = z.enum([
  'explain',
  'simple',
  'detailed',
  'why_correct',
  'why_wrong',
  'similar_question',
]);
export type ExplanationMode = z.infer<typeof ExplanationModeEnum>;

export const WhyOptionWrongSchema = z.object({
  option: z.string(),
  reason: z.string(),
});
export type WhyOptionWrong = z.infer<typeof WhyOptionWrongSchema>;

export const SimilarQuestionSchema = z.object({
  questionText: z.string().min(5),
  options: z.array(z.string()).min(2),
  correctAnswer: z.string(),
  explanation: z.string().min(5),
});
export type SimilarQuestion = z.infer<typeof SimilarQuestionSchema>;

export const ExplanationOutputSchema = z.object({
  mode: ExplanationModeEnum,
  explanation: z.string().min(5),
  keyConcept: z.string().min(2),
  stepByStep: z.array(z.string()).min(1),
  formulaOrRule: z.string().nullable().optional(),
  whyOptionsWrong: z.array(WhyOptionWrongSchema).optional().default([]),
  similarQuestion: SimilarQuestionSchema.nullable().optional(),
});
export type ExplanationOutput = z.infer<typeof ExplanationOutputSchema>;

export const StudyAssistantIntentEnum = z.enum([
  'study_today',
  'weakest_topic',
  'revision_plan',
  'performance_trend',
  'similar_practice',
  'general_advice',
]);
export type StudyAssistantIntent = z.infer<typeof StudyAssistantIntentEnum>;

export const RevisionDaySchema = z.object({
  day: z.string(),
  focus: z.string(),
  durationMinutes: z.number().int().positive(),
});
export type RevisionDay = z.infer<typeof RevisionDaySchema>;

export const StudyAssistantOutputSchema = z.object({
  intent: StudyAssistantIntentEnum,
  summary: z.string().min(10),
  recommendedActions: z.array(z.string()).min(1),
  suggestedTopics: z.array(z.string()).default([]),
  suggestedQuestions: z.array(z.string()).optional().default([]),
  revisionSchedule: z.array(RevisionDaySchema).optional().default([]),
});
export type StudyAssistantOutput = z.infer<typeof StudyAssistantOutputSchema>;

export const GeneratedOptionSchema = z.object({
  identifier: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().min(1),
});
export type GeneratedOption = z.infer<typeof GeneratedOptionSchema>;

export const GeneratedQuestionSchema = z.object({
  questionText: z.string().min(10),
  options: z.array(GeneratedOptionSchema).length(4),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().min(10),
  questionType: z.enum(['MCQ', 'NUMERICAL', 'ASSERTION_REASON', 'STATEMENT_BASED']).default('MCQ'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  subject: z.string().min(2),
  topic: z.string().min(2),
  calculatedAnswer: z.string().nullable().optional(),
  verificationSteps: z.array(z.string()).optional().default([]),
});
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export const GeneratedQuestionBatchSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(1),
});
export type GeneratedQuestionBatch = z.infer<typeof GeneratedQuestionBatchSchema>;
