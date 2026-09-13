import { AIProvider } from './provider';
import {
  GeneratedQuestion,
  GeneratedQuestionBatch,
  GeneratedQuestionBatchSchema,
} from './schemas';
import {
  buildQuestionGenerationPrompt,
  QuestionGenerationPromptContext,
} from './prompts';
import {
  MathValidator,
  NumericalAnswerValidator,
  DuplicateQuestionDetector,
  sanitizeAIContent,
} from './validation';

export interface VerifiedCandidateQuestion extends GeneratedQuestion {
  isMathValid: boolean;
  isNumericalVerified: boolean;
  isDuplicate: boolean;
  duplicateSimilarity: number;
  duplicateOf?: string;
  validationErrors: string[];
  verificationBadge: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
}

export interface QuestionGenerationResult {
  questions: VerifiedCandidateQuestion[];
  totalGenerated: number;
  validCount: number;
  rejectedCount: number;
  tokenCost: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
}

export class QuestionGeneratorService {
  /**
   * Generates candidate CDS exam questions for admin review.
   * Runs schema validation, duplicate detection, and independent mathematical calculation verification.
   * Never marks questions as PUBLISHED.
   */
  static async generate(
    provider: AIProvider,
    context: QuestionGenerationPromptContext,
    options: { timeoutMs?: number } = {}
  ): Promise<QuestionGenerationResult> {
    const messages = buildQuestionGenerationPrompt(context);

    const response = await provider.generateText(messages, {
      responseFormat: 'json',
      timeoutMs: options.timeoutMs || 20000,
      temperature: 0.4,
    });

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(response.content);
    } catch (err: any) {
      throw new Error(`Failed to parse AI question generation output as JSON: ${err.message}`);
    }

    const parseResult = GeneratedQuestionBatchSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      throw new Error(
        `Generated questions failed schema validation: ${parseResult.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    const verifiedQuestions: VerifiedCandidateQuestion[] = [];
    let validCount = 0;
    let rejectedCount = 0;

    for (const q of parseResult.data.questions) {
      const validationErrors: string[] = [];

      // 1. Validate KaTeX formatting in question text & explanation
      const mathVal = MathValidator.validate(`${q.questionText} ${q.explanation}`);
      if (!mathVal.isValid) {
        validationErrors.push(...mathVal.errors);
      }

      // 2. Deterministic Numerical / Math Verification
      const numVal = NumericalAnswerValidator.verify(
        q.questionText,
        q.options,
        q.correctAnswer,
        q.calculatedAnswer
      );
      if (!numVal.isVerified) {
        validationErrors.push(...numVal.errors);
      }

      // 3. Duplicate Detection against existing questions
      const dupCheck = DuplicateQuestionDetector.checkDuplicate(
        q.questionText,
        context.existingQuestionSnippets || []
      );
      if (dupCheck.isDuplicate) {
        validationErrors.push(
          `Potential duplicate detected (${Math.round(dupCheck.highestSimilarity * 100)}% match with existing question).`
        );
      }

      // 4. Assign Verification Badge
      let badge: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED' = 'VERIFIED';
      if (!numVal.isVerified || dupCheck.isDuplicate) {
        badge = 'REJECTED';
        rejectedCount++;
      } else if (!mathVal.isValid || validationErrors.length > 0) {
        badge = 'NEEDS_REVIEW';
        validCount++;
      } else {
        validCount++;
      }

      verifiedQuestions.push({
        ...q,
        questionText: sanitizeAIContent(q.questionText),
        explanation: sanitizeAIContent(q.explanation),
        isMathValid: mathVal.isValid,
        isNumericalVerified: numVal.isVerified,
        isDuplicate: dupCheck.isDuplicate,
        duplicateSimilarity: dupCheck.highestSimilarity,
        duplicateOf: dupCheck.duplicateOf,
        validationErrors,
        verificationBadge: badge,
      });
    }

    return {
      questions: verifiedQuestions,
      totalGenerated: verifiedQuestions.length,
      validCount,
      rejectedCount,
      tokenCost: response.tokenCost || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: response.model,
    };
  }
}
