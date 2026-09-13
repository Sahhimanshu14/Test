import { describe, it, expect } from 'vitest';
import {
  MockAIProvider,
  getAIProvider,
  MathValidator,
  NumericalAnswerValidator,
  DuplicateQuestionDetector,
  QuestionExplanationService,
  AIStudyAssistantService,
  QuestionGeneratorService,
  ExplanationMode,
} from '../src';

describe('Phase 11 — AI Package Test Suite', () => {
  describe('1. MockAIProvider & Provider Abstraction', () => {
    it('generates text using mock provider', async () => {
      const provider = getAIProvider('mock');
      const response = await provider.generateText([
        { role: 'user', content: 'What is Pythagoras theorem?' },
      ]);

      expect(response.content).toContain('[CDSPrep AI Assistant]');
      expect(response.tokenCost?.totalTokens).toBeGreaterThan(0);
      expect(response.model).toBe('mock-cds-model-v1');
    });

    it('streams text chunks using async iterable', async () => {
      const provider = new MockAIProvider();
      const chunks: string[] = [];
      for await (const chunk of provider.streamText!([
        { role: 'user', content: 'Explain geometry.' },
      ])) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.join('')).toContain('Step 1: Parse the core theorem');
    });

    it('handles simulated timeout error safely', async () => {
      const provider = new MockAIProvider({ simulateTimeout: true });
      await expect(
        provider.generateText([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('AI Provider Request Timed Out');
    });

    it('handles simulated rate limit error safely', async () => {
      const provider = new MockAIProvider({ simulateRateLimit: true });
      await expect(
        provider.generateText([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('returns malformed JSON when simulated', async () => {
      const provider = new MockAIProvider({ simulateMalformedJson: true });
      const res = await provider.generateText([{ role: 'user', content: 'Hello' }], {
        responseFormat: 'json',
      });
      expect(() => JSON.parse(res.content)).toThrow();
    });
  });

  describe('2. Validation Engine (Math, Numerical, Duplicate)', () => {
    describe('MathValidator', () => {
      it('validates properly balanced inline math and block math', () => {
        const text =
          'Solve for $x$: $$x^2 - 5x + 6 = 0$$, so $(x - 2)(x - 3) = 0$.';
        const res = MathValidator.validate(text);
        expect(res.isValid).toBe(true);
        expect(res.formulaCount).toBe(3); // 1 block + 2 inline
      });

      it('detects unclosed inline math', () => {
        const text = 'The area is calculated as $A = \\pi r^2 without closing dollar.';
        const res = MathValidator.validate(text);
        expect(res.isValid).toBe(false);
        expect(res.errors[0]).toContain('unclosed inline math delimiter');
      });

      it('detects unclosed block math', () => {
        const text = 'Block equation: $$E = mc^2 and missing ending.';
        const res = MathValidator.validate(text);
        expect(res.isValid).toBe(false);
        expect(res.errors[0]).toContain('mismatched block math delimiter');
      });

      it('detects unbalanced brackets inside KaTeX formula', () => {
        const text = 'Formula: $f(x) = \\frac{1}{(x + 1} + 2$.';
        const res = MathValidator.validate(text);
        expect(res.isValid).toBe(false);
        expect(res.errors[0]).toContain('Unbalanced brackets');
      });
    });

    describe('NumericalAnswerValidator', () => {
      it('verifies consistent numerical answer when option matches calculation', () => {
        const questionText = 'What is 20% of 150?';
        const options = [
          { identifier: 'A', text: '25' },
          { identifier: 'B', text: '30' },
          { identifier: 'C', text: '35' },
          { identifier: 'D', text: '40' },
        ];
        const res = NumericalAnswerValidator.verify(questionText, options, 'B', '30');
        expect(res.isVerified).toBe(true);
        expect(res.errors.length).toBe(0);
      });

      it('rejects numerical answer when calculated value contradicts correct option', () => {
        const questionText = 'What is 20% of 150?';
        const options = [
          { identifier: 'A', text: '25' },
          { identifier: 'B', text: '30' },
          { identifier: 'C', text: '35' },
          { identifier: 'D', text: '40' },
        ];
        // Claiming answer is 30, but marked option is A (25)
        const res = NumericalAnswerValidator.verify(questionText, options, 'A', '30');
        expect(res.isVerified).toBe(false);
        expect(res.errors.some((e) => e.includes('differs from') || e.includes('inconsistency'))).toBe(true);
      });
    });

    describe('DuplicateQuestionDetector', () => {
      it('detects duplicate question with high lexical similarity', () => {
        const candidate = 'A train running at 54 km/h passes a platform 150 meters long in 20 seconds.';
        const existing = [
          'A train running at 54 km/h takes 20 seconds to pass a platform 150 meters long.',
          'What is the capital of India?',
        ];
        const res = DuplicateQuestionDetector.checkDuplicate(candidate, existing, 0.7);
        expect(res.isDuplicate).toBe(true);
        expect(res.highestSimilarity).toBeGreaterThanOrEqual(0.7);
        expect(res.duplicateOf).toBe(existing[0]);
      });

      it('permits distinct questions below the similarity threshold', () => {
        const candidate = 'Under which Article is the Vice President ex-officio Chairman of Rajya Sabha?';
        const existing = [
          'A train running at 54 km/h takes 20 seconds to pass a platform 150 meters long.',
          'Under which Article of the Constitution is the Annual Financial Statement presented?',
        ];
        const res = DuplicateQuestionDetector.checkDuplicate(candidate, existing, 0.75);
        expect(res.isDuplicate).toBe(false);
      });
    });
  });

  describe('3. QuestionExplanationService (6 Supported Modes)', () => {
    const baseContext = {
      questionText: 'A train running at 54 km/h takes 20 seconds to pass a platform 150 meters long. What is the length of the train?',
      subjectName: 'Elementary Mathematics',
      topicName: 'Speed, Distance & Time',
      options: [
        { identifier: 'A', text: '120 m' },
        { identifier: 'B', text: '150 m', isCorrect: true },
        { identifier: 'C', text: '180 m' },
        { identifier: 'D', text: '200 m' },
      ],
      correctOptionIdentifier: 'B',
      officialExplanation: 'Speed = 15 m/s. Distance = 300 m. Train length = 300 - 150 = 150 m.',
    };

    const modes: ExplanationMode[] = [
      'explain',
      'simple',
      'detailed',
      'why_correct',
      'why_wrong',
      'similar_question',
    ];

    for (const mode of modes) {
      it(`generates structured explanation for mode "${mode}"`, async () => {
        const provider = new MockAIProvider();
        const res = await QuestionExplanationService.explain(provider, {
          ...baseContext,
          mode,
        });

        expect(res.data.mode).toBe(mode);
        expect(res.data.explanation.length).toBeGreaterThan(10);
        expect(res.data.stepByStep.length).toBeGreaterThan(0);
        expect(res.data.keyConcept).toBeDefined();
        expect(res.isMathValid).toBe(true);

        if (mode === 'why_wrong') {
          expect(res.data.whyOptionsWrong?.length).toBeGreaterThan(0);
        }
        if (mode === 'similar_question') {
          expect(res.data.similarQuestion).toBeDefined();
          expect(res.data.similarQuestion?.options.length).toBeGreaterThan(1);
        }
      });
    }

    it('gracefully degrades to deterministic fallback when provider fails', async () => {
      const failingProvider = new MockAIProvider({ simulateTimeout: true });
      const res = await QuestionExplanationService.explain(failingProvider, {
        ...baseContext,
        mode: 'explain',
      });

      expect(res.data.explanation).toContain('Speed = 15 m/s');
      expect(res.model).toBe('fallback-offline');
      expect(res.isMathValid).toBe(true);
    });
  });

  describe('4. AIStudyAssistantService (5 User Query Intents)', () => {
    const baseContext = {
      targetAcademy: 'IMA',
      streakDays: 4,
      overallAccuracy: 68.5,
      questionsSolved: 140,
      testsCompleted: 3,
      weakTopics: [
        { topicName: 'Modern Indian History', accuracy: 48, totalAttempts: 25 },
        { topicName: 'Trigonometry', accuracy: 52, totalAttempts: 30 },
      ],
      dailyGoals: {
        questionsSolvedToday: 12,
        questionTarget: 25,
        testsCompletedToday: 0,
        testTarget: 1,
        studyMinutesToday: 20,
        studyMinuteTarget: 45,
      },
    };

    const queries: Array<'study_today' | 'weakest_topic' | 'revision_plan' | 'performance_trend' | 'similar_practice'> = [
      'study_today',
      'weakest_topic',
      'revision_plan',
      'performance_trend',
      'similar_practice',
    ];

    for (const queryType of queries) {
      it(`handles student query "${queryType}" with tenant-isolated data`, async () => {
        const provider = new MockAIProvider();
        const res = await AIStudyAssistantService.advise(provider, {
          ...baseContext,
          queryType,
        });

        expect(res.data.intent).toBe(queryType);
        expect(res.data.summary.length).toBeGreaterThan(15);
        expect(res.data.recommendedActions.length).toBeGreaterThan(0);
        expect(res.data.suggestedTopics.length).toBeGreaterThan(0);
      });
    }

    it('provides deterministic fallback when provider returns rate limit error', async () => {
      const rateLimitedProvider = new MockAIProvider({ simulateRateLimit: true });
      const res = await AIStudyAssistantService.advise(rateLimitedProvider, {
        ...baseContext,
        queryType: 'study_today',
      });

      expect(res.data.summary).toContain('Modern Indian History');
      expect(res.model).toBe('fallback-deterministic');
    });
  });

  describe('5. QuestionGeneratorService (Admin Workflow)', () => {
    it('generates candidate questions with schema validation and math verification', async () => {
      const provider = new MockAIProvider();
      const res = await QuestionGeneratorService.generate(provider, {
        subject: 'Elementary Mathematics',
        topic: 'Speed, Distance & Time',
        difficulty: 'MEDIUM',
        questionType: 'MCQ',
        count: 2,
        existingQuestionSnippets: ['What is the capital of France?'],
      });

      expect(res.totalGenerated).toBe(2);
      expect(res.validCount).toBeGreaterThan(0);

      const mathQuestion = res.questions.find((q) => q.topic === 'Speed, Distance & Time');
      expect(mathQuestion).toBeDefined();
      expect(mathQuestion?.options.length).toBe(4);
      expect(mathQuestion?.isMathValid).toBe(true);
      expect(mathQuestion?.isNumericalVerified).toBe(true);
      expect(mathQuestion?.verificationBadge).toBe('VERIFIED');
    });

    it('flags duplicate questions against existing question bank', async () => {
      const provider = new MockAIProvider();
      // Provide snippet matching the mock question text to trigger duplicate detector
      const existingSnippet =
        'A train running at 54 km/h takes 20 seconds to pass a platform 150 meters long.';

      const res = await QuestionGeneratorService.generate(provider, {
        subject: 'Elementary Mathematics',
        topic: 'Speed, Distance & Time',
        difficulty: 'MEDIUM',
        questionType: 'MCQ',
        count: 2,
        existingQuestionSnippets: [existingSnippet],
      });

      const duplicateQuestion = res.questions.find((q) => q.topic === 'Speed, Distance & Time');
      expect(duplicateQuestion?.isDuplicate).toBe(true);
      expect(duplicateQuestion?.verificationBadge).toBe('REJECTED');
      expect(res.rejectedCount).toBeGreaterThan(0);
    });
  });
});
