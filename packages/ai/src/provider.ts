import { OpenAIProvider } from './openai-provider';
import { GoogleProvider } from './google-provider';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  responseFormat?: 'text' | 'json';
  timeoutMs?: number;
}

export interface AITokenCost {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIResponse {
  content: string;
  tokenCost?: AITokenCost;
  model: string;
}

export interface AIProvider {
  readonly providerName: string;
  generateText(messages: AIMessage[], options?: AIOptions): Promise<AIResponse>;
  streamText?(messages: AIMessage[], options?: AIOptions): AsyncIterable<string>;
}

export interface MockAIProviderConfig {
  simulateTimeout?: boolean;
  simulateRateLimit?: boolean;
  simulateMalformedJson?: boolean;
  fixedModelName?: string;
}

export class MockAIProvider implements AIProvider {
  readonly providerName = 'mock';

  constructor(private readonly config: MockAIProviderConfig = {}) {}

  async generateText(messages: AIMessage[], options?: AIOptions): Promise<AIResponse> {
    if (this.config.simulateTimeout) {
      throw new Error('AI Provider Request Timed Out (exceeded deadline)');
    }

    if (this.config.simulateRateLimit) {
      throw new Error('AI Provider 429: Rate limit exceeded, please retry later');
    }

    if (this.config.simulateMalformedJson && options?.responseFormat === 'json') {
      return {
        content: '{"incomplete_json": true, "unclosed_string": "',
        tokenCost: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        model: this.config.fixedModelName || 'mock-cds-model-v1',
      };
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';

    // If json requested, synthesize realistic structured output based on prompt context
    if (options?.responseFormat === 'json') {
      // 1. Check for Question Generation request
      if (
        systemPrompt.includes('question_generation') ||
        lastUserMessage.includes('GENERATE_QUESTIONS_BATCH')
      ) {
        return {
          content: JSON.stringify({
            questions: [
              {
                questionText:
                  'A train running at 54 km/h takes 20 seconds to pass a platform 150 meters long. What is the length of the train in meters?',
                options: [
                  { identifier: 'A', text: '120 m' },
                  { identifier: 'B', text: '150 m' },
                  { identifier: 'C', text: '180 m' },
                  { identifier: 'D', text: '200 m' },
                ],
                correctAnswer: 'B',
                explanation:
                  'Speed in m/s = $54 \\times \\frac{5}{18} = 15$ m/s. Total distance covered in 20 seconds = $15 \\times 20 = 300$ m. Since total distance = Train Length + Platform Length, $300 = L + 150 \\implies L = 150$ m.',
                questionType: 'MCQ',
                difficulty: 'MEDIUM',
                subject: 'Elementary Mathematics',
                topic: 'Speed, Distance & Time',
                calculatedAnswer: '150',
                verificationSteps: [
                  'Converted 54 km/h to m/s: 54 * 5/18 = 15 m/s',
                  'Calculated distance covered: 15 * 20 = 300 m',
                  'Subtracted platform length: 300 - 150 = 150 m',
                ],
              },
              {
                questionText:
                  'Under which Article of the Constitution of India is the Annual Financial Statement (Union Budget) presented to Parliament?',
                options: [
                  { identifier: 'A', text: 'Article 110' },
                  { identifier: 'B', text: 'Article 112' },
                  { identifier: 'C', text: 'Article 114' },
                  { identifier: 'D', text: 'Article 116' },
                ],
                correctAnswer: 'B',
                explanation:
                  'Article 112 of the Constitution requires the President to cause to be laid before both Houses of Parliament an Annual Financial Statement representing the estimated receipts and expenditure of the Government of India.',
                questionType: 'MCQ',
                difficulty: 'EASY',
                subject: 'General Knowledge',
                topic: 'Indian Polity & Constitution',
                calculatedAnswer: null,
                verificationSteps: [
                  'Article 110 relates to Money Bills',
                  'Article 112 explicitly defines Annual Financial Statement',
                  'Article 114 defines Appropriation Bills',
                ],
              },
            ],
          }),
          tokenCost: { promptTokens: 120, completionTokens: 280, totalTokens: 400 },
          model: this.config.fixedModelName || 'mock-cds-model-v1',
        };
      }

      // 2. Check for Study Assistant query
      if (
        systemPrompt.includes('study_assistant') ||
        lastUserMessage.includes('STUDY_ASSISTANT_QUERY')
      ) {
        let intent = 'study_today';
        if (lastUserMessage.includes('weakest_topic')) intent = 'weakest_topic';
        else if (lastUserMessage.includes('revision_plan')) intent = 'revision_plan';
        else if (lastUserMessage.includes('performance_trend')) intent = 'performance_trend';
        else if (lastUserMessage.includes('similar_practice')) intent = 'similar_practice';

        return {
          content: JSON.stringify({
            intent,
            summary:
              'Based on your recent CDS performance data, your primary focus should be strengthening Modern Indian History and Geometry to maximize your net score above the IMA cutoff.',
            recommendedActions: [
              'Complete a 15-question targeted drill on Indian National Movement (1885-1947).',
              'Review 3 mistake notebook items in Mensuration and Circle Theorems.',
              'Attempt one 60-minute sectional mock test on Elementary Mathematics.',
            ],
            suggestedTopics: [
              'Modern Indian History',
              'Geometry & Mensuration',
              'Sentence Improvement',
            ],
            suggestedQuestions: [],
            revisionSchedule: [
              { day: 'Day 1', focus: 'Modern Indian History Drills & Mistakes', durationMinutes: 45 },
              { day: 'Day 2', focus: 'Trigonometry & Heights/Distances', durationMinutes: 60 },
              { day: 'Day 3', focus: 'English Comprehension & Spotting Errors', durationMinutes: 45 },
              { day: 'Day 4', focus: 'Comprehensive Sectional Mock Exam', durationMinutes: 120 },
            ],
          }),
          tokenCost: { promptTokens: 80, completionTokens: 180, totalTokens: 260 },
          model: this.config.fixedModelName || 'mock-cds-model-v1',
        };
      }

      // 3. Check for Explanation query
      const fullText = (systemPrompt + ' ' + lastUserMessage).toLowerCase();
      let mode = 'explain';
      if (fullText.includes('"mode": "simple"') || fullText.includes('mode: simple')) mode = 'simple';
      else if (fullText.includes('"mode": "detailed"') || fullText.includes('mode: detailed')) mode = 'detailed';
      else if (fullText.includes('"mode": "why_correct"') || fullText.includes('mode: why_correct')) mode = 'why_correct';
      else if (fullText.includes('"mode": "why_wrong"') || fullText.includes('mode: why_wrong')) mode = 'why_wrong';
      else if (fullText.includes('"mode": "similar_question"') || fullText.includes('mode: similar_question')) mode = 'similar_question';

      return {
        content: JSON.stringify({
          mode,
          explanation:
            'This question tests core conceptual understanding. The correct choice follows directly from established fundamental theorems and rules applicable to the UPSC CDS syllabus.',
          keyConcept: 'Core UPSC CDS Subject Fundamentals',
          stepByStep: [
            'Identify the given conditions and identify relevant governing principles.',
            'Apply the formal mathematical identity or constitutional provision.',
            'Conclude the unique consistent answer by eliminating distractors.',
          ],
          formulaOrRule: '$Speed = \\frac{Distance}{Time}$ or applicable governing rule',
          whyOptionsWrong: [
            { option: 'A', reason: 'Incorrect calculation/premise failing to account for constraints.' },
            { option: 'C', reason: 'Confuses unrelated provision or inverts the dimensional unit.' },
            { option: 'D', reason: 'Overestimates boundary conditions.' },
          ],
          similarQuestion:
            mode === 'similar_question'
              ? {
                  questionText:
                    'A 180-meter long train crosses an electric pole in 9 seconds. What is its speed in km/h?',
                  options: ['54 km/h', '64 km/h', '72 km/h', '80 km/h'],
                  correctAnswer: 'C',
                  explanation:
                    'Speed = $\\frac{180}{9} = 20$ m/s. Converting to km/h: $20 \\times \\frac{18}{5} = 72$ km/h.',
                }
              : null,
        }),
        tokenCost: { promptTokens: 50, completionTokens: 150, totalTokens: 200 },
        model: this.config.fixedModelName || 'mock-cds-model-v1',
      };
    }

    return {
      content: `[CDSPrep AI Assistant]: Structured guidance for your query: "${lastUserMessage.slice(0, 100)}". Keep drilling consistently!`,
      tokenCost: { promptTokens: 30, completionTokens: 50, totalTokens: 80 },
      model: this.config.fixedModelName || 'mock-cds-model-v1',
    };
  }

  async *streamText(_messages: AIMessage[], _options?: AIOptions): AsyncIterable<string> {
    const chunks = [
      'Understanding the fundamental principles ',
      'of this UPSC CDS topic is essential.\n\n',
      'Step 1: Parse the core theorem or rule.\n',
      'Step 2: Eliminate invalid choices systematically.\n',
      'Step 3: Confirm the exact match.',
    ];
    for (const chunk of chunks) {
      yield chunk;
    }
  }
}

/**
 * AI Provider Registry / Factory
 * Instantiates the appropriate provider with strict credential safety.
 */
export interface ProviderFactoryOptions extends MockAIProviderConfig {
  apiKey?: string;
  defaultModel?: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseUrl?: string;
}

export function getAIProvider(providerName = 'mock', config?: ProviderFactoryOptions): AIProvider {
  const normalized = providerName.toLowerCase();

  switch (normalized) {
    case 'openai': {
      if (!config?.apiKey) {
        throw new Error('OpenAI provider selected but no apiKey was provided');
      }
      return new OpenAIProvider({
        apiKey: config.apiKey,
        defaultModel: config.defaultModel,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        baseUrl: config.baseUrl,
      });
    }

    case 'google': {
      if (!config?.apiKey) {
        throw new Error('Google provider selected but no apiKey was provided');
      }
      return new GoogleProvider({
        apiKey: config.apiKey,
        defaultModel: config.defaultModel,
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
        baseUrl: config.baseUrl,
      });
    }

    case 'mock':
    default:
      return new MockAIProvider(config);
  }
}
