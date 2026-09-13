import { AIProvider } from './provider';
import { ExplanationOutput, ExplanationOutputSchema, ExplanationMode } from './schemas';
import { buildExplanationPrompt, ExplanationPromptContext } from './prompts';
import { MathValidator, sanitizeAIContent } from './validation';

export interface ExplanationExecutionResult {
  data: ExplanationOutput;
  isMathValid: boolean;
  mathErrors: string[];
  tokenCost: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
}

export class QuestionExplanationService {
  /**
   * Generates a structured educational explanation for a CDS question.
   * Handles timeout, provider error, rate limit, and malformed JSON safely.
   */
  static async explain(
    provider: AIProvider,
    context: ExplanationPromptContext,
    options: { timeoutMs?: number } = {}
  ): Promise<ExplanationExecutionResult> {
    const messages = buildExplanationPrompt(context);

    try {
      const response = await provider.generateText(messages, {
        responseFormat: 'json',
        timeoutMs: options.timeoutMs || 15000,
        temperature: 0.2, // low temperature for precise factual adherence
      });

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(response.content);
      } catch (jsonErr) {
        // Fallback for malformed JSON output
        parsedJson = this.buildFallbackExplanation(context, 'Structured JSON parsing failed from provider output.');
      }

      const parseResult = ExplanationOutputSchema.safeParse(parsedJson);
      const data: ExplanationOutput = parseResult.success
        ? {
            ...parseResult.data,
            explanation: sanitizeAIContent(parseResult.data.explanation),
          }
        : this.buildFallbackExplanation(
            context,
            `Schema validation failed: ${parseResult.error.errors.map((e) => e.message).join(', ')}`
          );

      const mathValidation = MathValidator.validate(data.explanation);

      return {
        data,
        isMathValid: mathValidation.isValid,
        mathErrors: mathValidation.errors,
        tokenCost: response.tokenCost || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: response.model,
      };
    } catch (err: any) {
      // Gracefully handle provider errors / timeouts without unhandled crash
      const fallback = this.buildFallbackExplanation(
        context,
        `AI Explanation unavailable: ${err.message || 'Provider connection issue'}`
      );
      return {
        data: fallback,
        isMathValid: true,
        mathErrors: [],
        tokenCost: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: 'fallback-offline',
      };
    }
  }

  private static buildFallbackExplanation(
    context: ExplanationPromptContext,
    reason: string
  ): ExplanationOutput {
    const correctOpt = context.options.find(
      (o) => o.isCorrect || o.identifier === context.correctOptionIdentifier
    );

    return {
      mode: context.mode,
      explanation:
        context.officialExplanation ||
        `Conceptual Explanation for ${context.topicName}: Option ${correctOpt ? `[${correctOpt.identifier}] ${correctOpt.text}` : 'marked as correct'} directly satisfies the required conditions. (${reason})`,
      keyConcept: `${context.subjectName} — ${context.topicName}`,
      stepByStep: [
        'Review the key theorem or provision for this topic.',
        'Eliminate options with contradictory boundary conditions or arithmetic inconsistencies.',
        `Verify option ${correctOpt?.identifier || 'correct answer'} as the canonical solution.`,
      ],
      formulaOrRule: null,
      whyOptionsWrong: context.options
        .filter((o) => !(o.isCorrect || o.identifier === context.correctOptionIdentifier))
        .map((o) => ({
          option: o.identifier,
          reason: 'Fails to satisfy problem constraints or inverts the governing formula.',
        })),
      similarQuestion: null,
    };
  }
}
