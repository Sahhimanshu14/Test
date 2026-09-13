import { AIProvider } from './provider';
import { StudyAssistantOutput, StudyAssistantOutputSchema, StudyAssistantIntent } from './schemas';
import { buildStudyAssistantPrompt, StudyAssistantPromptContext } from './prompts';
import { sanitizeAIContent } from './validation';

export interface StudyAssistantResult {
  data: StudyAssistantOutput;
  tokenCost: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
}

export class AIStudyAssistantService {
  /**
   * Generates tailored study guidance based on authorized candidate performance data.
   * Never exposes or consumes another user's data.
   */
  static async advise(
    provider: AIProvider,
    context: StudyAssistantPromptContext,
    options: { timeoutMs?: number } = {}
  ): Promise<StudyAssistantResult> {
    const messages = buildStudyAssistantPrompt(context);

    try {
      const response = await provider.generateText(messages, {
        responseFormat: 'json',
        timeoutMs: options.timeoutMs || 15000,
        temperature: 0.3,
      });

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(response.content);
      } catch (jsonErr) {
        parsedJson = this.buildFallbackAdvice(context);
      }

      const parseResult = StudyAssistantOutputSchema.safeParse(parsedJson);
      const data: StudyAssistantOutput = parseResult.success
        ? {
            ...parseResult.data,
            summary: sanitizeAIContent(parseResult.data.summary),
          }
        : this.buildFallbackAdvice(context);

      return {
        data,
        tokenCost: response.tokenCost || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: response.model,
      };
    } catch (err: any) {
      // Graceful degradation when network/provider issues arise
      const fallback = this.buildFallbackAdvice(context);
      return {
        data: fallback,
        tokenCost: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: 'fallback-deterministic',
      };
    }
  }

  private static buildFallbackAdvice(context: StudyAssistantPromptContext): StudyAssistantOutput {
    const primaryWeakness = context.weakTopics[0]?.topicName || 'Syllabus Core Fundamentals';
    const remainingQuestions = Math.max(
      0,
      context.dailyGoals.questionTarget - context.dailyGoals.questionsSolvedToday
    );

    return {
      intent: context.queryType as StudyAssistantIntent,
      summary: `Cadet HQ Deterministic Plan: Prioritize high-yield topic "${primaryWeakness}". You have ${remainingQuestions} questions remaining to achieve your daily target.`,
      recommendedActions: [
        `Complete a targeted 15-question drill on ${primaryWeakness}.`,
        'Review your active Mistake Notebook to eliminate repeated calculation/grammar errors.',
        `Maintain your ${context.streakDays}-day streak by completing at least 1 mock test or sectional drill today.`,
      ],
      suggestedTopics: context.weakTopics.map((t) => t.topicName).slice(0, 3),
      suggestedQuestions: [],
      revisionSchedule: [
        { day: 'Day 1', focus: primaryWeakness, durationMinutes: 45 },
        { day: 'Day 2', focus: 'Mistake Notebook Retries & Weak Areas', durationMinutes: 45 },
        { day: 'Day 3', focus: 'Timed Sectional Mock Test', durationMinutes: 60 },
      ],
    };
  }
}
