import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { ResultsService } from '../src/results/results.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('Phase 9 — Results & Analytics Service Suite', () => {
  let analyticsService: AnalyticsService;
  let resultsService: ResultsService;
  let mockPrisma: any;

  const studentUser1 = 'user-student-alpha';
  const studentUser2 = 'user-student-bravo';

  beforeEach(() => {
    mockPrisma = {
      client: {
        user: {
          findUnique: vi.fn(),
        },
        result: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        resultSubject: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        resultTopic: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        attemptAnswer: {
          findMany: vi.fn(),
          count: vi.fn().mockResolvedValue(0),
        },
        practiceAnswer: {
          count: vi.fn().mockResolvedValue(0),
        },
        practiceSession: {
          findFirst: vi.fn().mockResolvedValue(null),
          aggregate: vi.fn().mockResolvedValue({ _sum: { totalTimeSpentSeconds: 0 } }),
        },
        mistake: {
          count: vi.fn().mockResolvedValue(0),
        },
        bookmark: {
          count: vi.fn().mockResolvedValue(0),
          findMany: vi.fn().mockResolvedValue([]),
        },
        testAttempt: {
          findUnique: vi.fn(),
          count: vi.fn().mockResolvedValue(0),
          aggregate: vi.fn().mockResolvedValue({ _sum: { timeSpentSeconds: 0 } }),
        },
      },
    };

    analyticsService = new AnalyticsService(mockPrisma as unknown as PrismaService);
    resultsService = new ResultsService(mockPrisma as unknown as PrismaService);
  });

  describe('1. Student Dashboard Summary & Zero Fabrication Rule', () => {
    it('returns hasData: false with clean zero metrics when student has no completed tests', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: studentUser1,
        fullName: 'Vikram Batra',
        targetAcademy: 'IMA',
        currentStreak: 0,
        highestStreak: 0,
      });
      mockPrisma.client.result.findMany.mockResolvedValue([]);
      mockPrisma.client.mistake.count.mockResolvedValue(0);
      mockPrisma.client.bookmark.count.mockResolvedValue(0);

      const summary = await analyticsService.getStudentDashboardSummary(studentUser1);

      expect(summary.hasData).toBe(false);
      expect(summary.metrics.testsCompleted).toBe(0);
      expect(summary.metrics.totalQuestionsAttempted).toBe(0);
      expect(summary.metrics.totalCorrect).toBe(0);
      expect(summary.metrics.averageAccuracy).toBe(0);
      expect(summary.metrics.averageScore).toBe(0);
      expect(summary.metrics.readinessScore).toBe(0);
      expect(summary.metrics.activeMistakesCount).toBe(0);
      expect(summary.metrics.bookmarksCount).toBe(0);
    });

    it('calculates aggregate metrics, readiness score, and streak weighting accurately when data exists', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: studentUser1,
        fullName: 'Vikram Batra',
        targetAcademy: 'IMA',
        currentStreak: 5,
        highestStreak: 12,
      });

      mockPrisma.client.result.findMany.mockResolvedValue([
        {
          netScore: '65.50',
          accuracyPercent: '75.00',
          correctCount: 75,
          incorrectCount: 25,
          attemptedCount: 100,
          skippedCount: 20,
          totalQuestions: 120,
        },
        {
          netScore: '80.00',
          accuracyPercent: '85.00',
          correctCount: 85,
          incorrectCount: 15,
          attemptedCount: 100,
          skippedCount: 20,
          totalQuestions: 120,
        },
      ]);
      mockPrisma.client.mistake.count.mockResolvedValue(4);
      mockPrisma.client.bookmark.count.mockResolvedValue(7);

      const summary = await analyticsService.getStudentDashboardSummary(studentUser1);

      expect(summary.hasData).toBe(true);
      expect(summary.metrics.testsCompleted).toBe(2);
      expect(summary.metrics.totalQuestionsAttempted).toBe(200);
      expect(summary.metrics.totalCorrect).toBe(160);
      expect(summary.metrics.totalIncorrect).toBe(40);
      expect(summary.metrics.totalSkipped).toBe(40);
      expect(summary.metrics.totalQuestions).toBe(240);
      // Average accuracy = (75 + 85) / 2 = 80
      expect(summary.metrics.averageAccuracy).toBe(80);
      // Average score = (65.5 + 80) / 2 = 72.8
      expect(summary.metrics.averageScore).toBe(72.8);
      // Readiness: consistency (5 * 3 = 15) + tests (2 * 6 = 12) + accuracy (80/100 * 40 = 32) = 59
      expect(summary.metrics.readinessScore).toBe(59);
      expect(summary.metrics.activeMistakesCount).toBe(4);
      expect(summary.metrics.bookmarksCount).toBe(7);
    });
  });

  describe('2. Subject Analytics Breakdown', () => {
    it('returns hasData: false with empty subjects when no subject records exist', async () => {
      mockPrisma.client.resultSubject.findMany.mockResolvedValue([]);

      const result = await analyticsService.getSubjectAnalytics(studentUser1);

      expect(result.hasData).toBe(false);
      expect(result.subjects).toHaveLength(0);
    });

    it('aggregates performance across English, General Knowledge, and Elementary Mathematics', async () => {
      mockPrisma.client.resultSubject.findMany.mockResolvedValue([
        {
          subjectName: 'English',
          totalQuestions: 50,
          correctCount: 40,
          incorrectCount: 5,
          netScore: '38.35',
          accuracyPercent: '88.89',
        },
        {
          subjectName: 'General Knowledge',
          totalQuestions: 50,
          correctCount: 25,
          incorrectCount: 20,
          netScore: '18.40',
          accuracyPercent: '55.56',
        },
        {
          subjectName: 'Elementary Mathematics',
          totalQuestions: 50,
          correctCount: 30,
          incorrectCount: 10,
          netScore: '26.70',
          accuracyPercent: '75.00',
        },
        // Test 2 for English
        {
          subjectName: 'English',
          totalQuestions: 50,
          correctCount: 45,
          incorrectCount: 5,
          netScore: '43.35',
          accuracyPercent: '90.00',
        },
      ]);

      const res = await analyticsService.getSubjectAnalytics(studentUser1);

      expect(res.hasData).toBe(true);
      expect(res.subjects).toHaveLength(3);

      const english = res.subjects.find((s) => s.subjectName === 'English')!;
      expect(english).toBeDefined();
      expect(english.totalQuestions).toBe(100);
      expect(english.correctCount).toBe(85);
      expect(english.incorrectCount).toBe(10);
      expect(english.attemptedCount).toBe(95);
      expect(english.skippedCount).toBe(5);
      // Accuracy = (85 / 95) * 100 = 89.5%
      expect(english.accuracy).toBe(89.5);
      // Net Score = 38.35 + 43.35 = 81.7
      expect(english.netScore).toBe(81.7);

      const gk = res.subjects.find((s) => s.subjectName === 'General Knowledge')!;
      expect(gk.correctCount).toBe(25);
      expect(gk.incorrectCount).toBe(20);
      expect(gk.attemptedCount).toBe(45);
      // Accuracy = (25 / 45) * 100 = 55.6%
      expect(gk.accuracy).toBe(55.6);
    });
  });

  describe('3. Topic Analytics & Weakness Identification', () => {
    it('categorizes topic weakness indicators correctly into CRITICAL_WEAKNESS, MODERATE, and STRONG', async () => {
      mockPrisma.client.resultTopic.findMany.mockResolvedValue([
        {
          topicName: 'Modern Indian History',
          totalQuestions: 20,
          correctCount: 8,
          incorrectCount: 12,
          accuracyPercent: '40.00',
        },
        {
          topicName: 'Trigonometry',
          totalQuestions: 20,
          correctCount: 12,
          incorrectCount: 6,
          accuracyPercent: '66.67',
        },
        {
          topicName: 'Reading Comprehension',
          totalQuestions: 20,
          correctCount: 18,
          incorrectCount: 2,
          accuracyPercent: '90.00',
        },
      ]);

      const res = await analyticsService.getTopicAnalytics(studentUser1);

      expect(res.hasData).toBe(true);
      expect(res.topics).toHaveLength(3);

      // Weakest topics should be sorted first
      expect(res.topics[0].topicName).toBe('Modern Indian History');
      expect(res.topics[0].weaknessIndicator).toBe('CRITICAL_WEAKNESS');
      expect(res.topics[0].accuracy).toBe(40);

      expect(res.topics[1].topicName).toBe('Trigonometry');
      expect(res.topics[1].weaknessIndicator).toBe('MODERATE');
      expect(res.topics[1].accuracy).toBe(66.7);

      expect(res.topics[2].topicName).toBe('Reading Comprehension');
      expect(res.topics[2].weaknessIndicator).toBe('STRONG');
      expect(res.topics[2].accuracy).toBe(90);
    });

    it('returns hasData: false when topic history is empty', async () => {
      mockPrisma.client.resultTopic.findMany.mockResolvedValue([]);
      const res = await analyticsService.getTopicAnalytics(studentUser1);
      expect(res.hasData).toBe(false);
      expect(res.topics).toEqual([]);
    });
  });

  describe('4. Performance Trends Over Time', () => {
    it('returns chronological sequence of test attempts with cumulative questions solved', async () => {
      const d1 = new Date('2026-09-01T10:00:00Z');
      const d2 = new Date('2026-09-05T10:00:00Z');

      mockPrisma.client.result.findMany.mockResolvedValue([
        {
          id: 'res-1',
          createdAt: d1,
          netScore: '55.50',
          accuracyPercent: '70.00',
          attemptedCount: 50,
          correctCount: 35,
          incorrectCount: 15,
          skippedCount: 10,
          totalQuestions: 60,
          attempt: {
            startedAt: d1,
            submittedAt: d1,
            test: {
              title: 'CDS Mathematics Sectional 01',
              totalMarks: 100,
              testType: 'SUBJECT_TEST',
            },
          },
        },
        {
          id: 'res-2',
          createdAt: d2,
          netScore: '78.20',
          accuracyPercent: '85.00',
          attemptedCount: 55,
          correctCount: 47,
          incorrectCount: 8,
          skippedCount: 5,
          totalQuestions: 60,
          attempt: {
            startedAt: d2,
            submittedAt: d2,
            test: {
              title: 'CDS Mathematics Sectional 02',
              totalMarks: 100,
              testType: 'SUBJECT_TEST',
            },
          },
        },
      ]);

      const res = await analyticsService.getPerformanceTrends(studentUser1);

      expect(res.hasData).toBe(true);
      expect(res.trends).toHaveLength(2);
      expect(res.trends[0].attemptNumber).toBe(1);
      expect(res.trends[0].cumulativeQuestionsSolved).toBe(35);
      expect(res.trends[1].attemptNumber).toBe(2);
      expect(res.trends[1].cumulativeQuestionsSolved).toBe(82); // 35 + 47
      expect(res.trends[1].netScore).toBe(78.2);
    });

    it('returns hasData: false when student has no historical trends', async () => {
      mockPrisma.client.result.findMany.mockResolvedValue([]);
      const res = await analyticsService.getPerformanceTrends(studentUser1);
      expect(res.hasData).toBe(false);
      expect(res.trends).toEqual([]);
    });
  });

  describe('5. Time Analytics & Pacing Distribution', () => {
    it('computes average time per question, slow/fast topics, and distribution bins', async () => {
      mockPrisma.client.attemptAnswer.findMany.mockResolvedValue([
        // Trigonometry: 130s, 110s (avg 120s)
        {
          timeSpentSeconds: 130,
          question: {
            topic: { name: 'Trigonometry' },
            subject: { name: 'Elementary Mathematics' },
          },
        },
        {
          timeSpentSeconds: 110,
          question: {
            topic: { name: 'Trigonometry' },
            subject: { name: 'Elementary Mathematics' },
          },
        },
        // Grammar: 20s, 25s (avg 22.5s)
        {
          timeSpentSeconds: 20,
          question: {
            topic: { name: 'English Grammar' },
            subject: { name: 'English' },
          },
        },
        {
          timeSpentSeconds: 25,
          question: {
            topic: { name: 'English Grammar' },
            subject: { name: 'English' },
          },
        },
        // Indian Polity: 45s (avg 45s)
        {
          timeSpentSeconds: 45,
          question: {
            topic: { name: 'Indian Polity' },
            subject: { name: 'General Knowledge' },
          },
        },
      ]);

      const res = await analyticsService.getTimeAnalytics(studentUser1);

      expect(res.hasData).toBe(true);
      expect(res.totalTimedQuestions).toBe(5);
      expect(res.totalTimeSpentSeconds).toBe(330);
      // 330 / 5 = 66s
      expect(res.averageTimePerQuestionSeconds).toBe(66);

      // Slowest topic
      expect(res.slowTopics[0].topicName).toBe('Trigonometry');
      expect(res.slowTopics[0].averageTimeSeconds).toBe(120);

      // Fastest topic
      expect(res.fastTopics[0].topicName).toBe('English Grammar');
      expect(res.fastTopics[0].averageTimeSeconds).toBe(22.5);

      // Time distribution bins:
      // under 30s: 20, 25 => 2
      // 30 to 60s: 45 => 1
      // 60 to 120s: 110 => 1
      // over 120s: 130 => 1
      expect(res.timeDistribution.under30s).toBe(2);
      expect(res.timeDistribution.from30to60s).toBe(1);
      expect(res.timeDistribution.from60to120s).toBe(1);
      expect(res.timeDistribution.over120s).toBe(1);
    });

    it('returns empty distribution when no timed answers are recorded', async () => {
      mockPrisma.client.attemptAnswer.findMany.mockResolvedValue([]);
      const res = await analyticsService.getTimeAnalytics(studentUser1);

      expect(res.hasData).toBe(false);
      expect(res.averageTimePerQuestionSeconds).toBe(0);
      expect(res.slowTopics).toHaveLength(0);
      expect(res.fastTopics).toHaveLength(0);
      expect(res.timeDistribution.under30s).toBe(0);
    });
  });

  describe('6. Results Service & Question Review Security', () => {
    const mockAttemptWithResult = {
      id: 'att-100',
      userId: studentUser1,
      status: 'SUBMITTED',
      test: {
        sections: [
          {
            testQuestions: [
              {
                question: {
                  id: 'q-1',
                  questionText: 'What is the capital of India?',
                  marks: 1.0,
                  negativeMarks: 0.33,
                  options: [
                    { id: 'opt-1', optionText: 'New Delhi', isCorrect: true },
                    { id: 'opt-2', optionText: 'Mumbai', isCorrect: false },
                  ],
                  explanation: {
                    explanationText: 'New Delhi is the official capital.',
                  },
                  subject: { name: 'General Knowledge' },
                  chapter: { name: 'Geography' },
                  topic: { name: 'Capitals' },
                },
              },
            ],
          },
        ],
      },
      result: {
        id: 'res-100',
        netScore: 1.0,
        accuracyPercent: 100,
        subjectBreakdown: [],
        topicBreakdown: [],
      },
      answers: [
        {
          questionId: 'q-1',
          selectedOptionId: 'opt-1',
          timeSpentSeconds: 15,
        },
      ],
    };

    it('returns complete scorecard with questions, answers, and student bookmarks', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttemptWithResult);
      mockPrisma.client.bookmark.findMany.mockResolvedValue([{ questionId: 'q-1' }]);

      const result = await resultsService.getResultByAttempt(studentUser1, 'att-100');

      expect(result.id).toBe('att-100');
      expect(result.bookmarkedQuestionIds).toContain('q-1');
      expect(result.result.netScore).toBe(1.0);
    });

    it('throws ForbiddenException when attempting to access another student result', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttemptWithResult);

      await expect(
        resultsService.getResultByAttempt(studentUser2, 'att-100'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when attempt does not exist', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(null);

      await expect(
        resultsService.getResultByAttempt(studentUser1, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when attempt has no result yet (in progress)', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue({
        id: 'att-ongoing',
        userId: studentUser1,
        result: null,
      });

      await expect(
        resultsService.getResultByAttempt(studentUser1, 'att-ongoing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
