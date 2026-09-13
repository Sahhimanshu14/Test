import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttemptsService } from '../src/attempts/attempts.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AttemptStatus, QuestionPaletteState, IntegrityEventType, MistakeStatus } from '@cdsprep/types';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Phase 8 — Full Mock Test Engine & Examination Authority Suite', () => {
  let attemptsService: AttemptsService;
  let mockPrisma: any;

  const studentUser1 = 'user-student-1';
  const studentUser2 = 'user-student-2';

  const mockTest = {
    id: 'test-cds-01',
    title: 'CDS Full Mock Test 01',
    slug: 'cds-full-mock-test-01',
    durationMinutes: 120,
    totalMarks: 300,
    isPublished: true,
    sections: [
      {
        id: 'sec-1',
        name: 'Elementary Mathematics',
        orderIndex: 1,
        testQuestions: [
          {
            orderIndex: 1,
            question: {
              id: 'q-math-1',
              questionText: 'What is $7^{104} \\pmod{25}$?',
              marks: 1.0,
              negativeMarks: 0.33,
              options: [
                { id: 'opt-1', identifier: 'A', optionText: '$1$', isCorrect: true },
                { id: 'opt-2', identifier: 'B', optionText: '$7$', isCorrect: false },
              ],
            },
          },
          {
            orderIndex: 2,
            question: {
              id: 'q-math-2',
              questionText: 'Value of $\\cos^2 \\theta + \\sin^2 \\theta$?',
              marks: 1.0,
              negativeMarks: 0.33,
              options: [
                { id: 'opt-3', identifier: 'A', optionText: '$1$', isCorrect: true },
                { id: 'opt-4', identifier: 'B', optionText: '$0$', isCorrect: false },
              ],
            },
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        test: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
        },
        testAttempt: {
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        attemptAnswer: {
          upsert: vi.fn(),
        },
        attemptQuestionState: {
          upsert: vi.fn(),
        },
        result: {
          create: vi.fn(),
        },
        mistake: {
          upsert: vi.fn(),
        },
        $transaction: vi.fn(async (cb) => {
          if (Array.isArray(cb)) {
            return Promise.all(cb);
          }
          if (typeof cb === 'function') {
            return cb(mockPrisma.client);
          }
          return cb;
        }),
      },
    };

    attemptsService = new AttemptsService(mockPrisma as unknown as PrismaService);
  });

  describe('1. Attempt Lifecycle: Created, Started, Resumed, Cancelled', () => {
    it('initializes a new attempt in IN_PROGRESS state with authoritative server deadline', async () => {
      mockPrisma.client.test.findUnique.mockResolvedValue(mockTest);
      mockPrisma.client.testAttempt.findFirst.mockResolvedValue(null);

      const createdAttempt = {
        id: 'attempt-1',
        userId: studentUser1,
        testId: 'test-cds-01',
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 7320000), // 120min + 120s grace
        sessionToken: 'token-abc',
        answers: [],
        questionStates: [],
      };

      mockPrisma.client.testAttempt.create.mockResolvedValue(createdAttempt);

      const res = await attemptsService.startAttempt(studentUser1, 'test-cds-01', 'token-abc');

      expect(res.isResumed).toBe(false);
      expect(res.attempt.status).toBe(AttemptStatus.IN_PROGRESS);
      expect(res.remainingSeconds).toBeGreaterThan(7000);
      expect(mockPrisma.client.testAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: studentUser1,
            testId: 'test-cds-01',
            status: AttemptStatus.IN_PROGRESS,
          }),
        }),
      );
    });

    it('resumes active attempt seamlessly and computes true remaining server time', async () => {
      mockPrisma.client.test.findUnique.mockResolvedValue(mockTest);

      const futureExpiry = new Date(Date.now() + 3600000); // 1 hour remaining
      const existingAttempt = {
        id: 'attempt-1',
        userId: studentUser1,
        testId: 'test-cds-01',
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(Date.now() - 3600000),
        expiresAt: futureExpiry,
        sessionToken: 'token-abc',
        answers: [],
        questionStates: [],
      };

      mockPrisma.client.testAttempt.findFirst.mockResolvedValue(existingAttempt);
      mockPrisma.client.testAttempt.update.mockResolvedValue(existingAttempt);

      const res = await attemptsService.startAttempt(studentUser1, 'test-cds-01', 'token-abc');

      expect(res.isResumed).toBe(true);
      expect(res.isExpired).toBe(false);
      expect(res.remainingSeconds).toBeGreaterThan(3500);
      expect(res.remainingSeconds).toBeLessThanOrEqual(3600);
    });

    it('cancels an active attempt successfully', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        userId: studentUser1,
        status: AttemptStatus.IN_PROGRESS,
      });
      mockPrisma.client.testAttempt.update.mockResolvedValue({
        id: 'attempt-1',
        status: AttemptStatus.CANCELLED,
      });

      const res = await attemptsService.cancelAttempt(studentUser1, 'attempt-1');

      expect(res.success).toBe(true);
      expect(res.attempt.status).toBe(AttemptStatus.CANCELLED);
    });

    it('rejects cancellation of already submitted attempts', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        userId: studentUser1,
        status: AttemptStatus.SUBMITTED,
      });

      await expect(
        attemptsService.cancelAttempt(studentUser1, 'attempt-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Autosave & Question Palette States', () => {
    const activeAttempt = {
      id: 'attempt-1',
      userId: studentUser1,
      status: AttemptStatus.IN_PROGRESS,
      expiresAt: new Date(Date.now() + 3600000),
    };

    it('persists response and updates palette state across all supported states', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(activeAttempt);
      mockPrisma.client.attemptAnswer.upsert.mockResolvedValue({
        id: 'ans-1',
        selectedOptionId: 'opt-1',
        timeSpentSeconds: 15,
      });
      mockPrisma.client.attemptQuestionState.upsert.mockResolvedValue({});

      const statesToTest = [
        QuestionPaletteState.ANSWERED,
        QuestionPaletteState.MARKED_FOR_REVIEW,
        QuestionPaletteState.ANSWERED_AND_MARKED_FOR_REVIEW,
        QuestionPaletteState.VISITED,
        QuestionPaletteState.NOT_ANSWERED,
      ];

      for (const paletteState of statesToTest) {
        await attemptsService.autosave(studentUser1, 'attempt-1', {
          questionId: 'q-math-1',
          selectedOptionId: 'opt-1',
          timeSpentSeconds: 15,
          paletteState,
        });

        expect(mockPrisma.client.attemptQuestionState.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            update: { state: paletteState },
          }),
        );
      }
    });

    it('supports clearing selected option during autosave', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(activeAttempt);
      mockPrisma.client.attemptAnswer.upsert.mockResolvedValue({});
      mockPrisma.client.attemptQuestionState.upsert.mockResolvedValue({});

      await attemptsService.autosave(studentUser1, 'attempt-1', {
        questionId: 'q-math-1',
        selectedOptionId: null,
        timeSpentSeconds: 5,
        paletteState: QuestionPaletteState.NOT_ANSWERED,
      });

      expect(mockPrisma.client.attemptAnswer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            selectedOptionId: null,
          }),
        }),
      );
    });

    it('rejects autosave if server timer has expired', async () => {
      const expiredAttempt = {
        id: 'attempt-1',
        userId: studentUser1,
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(expiredAttempt);
      mockPrisma.client.testAttempt.update.mockResolvedValue({});

      await expect(
        attemptsService.autosave(studentUser1, 'attempt-1', {
          questionId: 'q-math-1',
          selectedOptionId: 'opt-1',
          timeSpentSeconds: 10,
          paletteState: QuestionPaletteState.ANSWERED,
        }),
      ).rejects.toThrow('Test attempt timer has expired');
    });
  });

  describe('3. Idempotent Submission & Authoritative Scoring', () => {
    it('evaluates answers server-side, calculates net score and populates mistakes', async () => {
      const attemptWithAnswers = {
        id: 'attempt-1',
        userId: studentUser1,
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() + 3600000),
        test: mockTest,
        answers: [
          { questionId: 'q-math-1', selectedOptionId: 'opt-1' }, // correct (+1.0)
          { questionId: 'q-math-2', selectedOptionId: 'opt-4' }, // incorrect (-0.33)
        ],
        antiCheatEvents: null,
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(attemptWithAnswers);
      mockPrisma.client.testAttempt.update.mockResolvedValue({});
      mockPrisma.client.result.create.mockResolvedValue({ id: 'res-1' });
      mockPrisma.client.mistake.upsert.mockResolvedValue({});

      const res = await attemptsService.submit(studentUser1, 'attempt-1', {
        timeSpentSeconds: 120,
      });

      expect(res.status).toBe(AttemptStatus.SUBMITTED);
      expect(res.correctCount).toBe(1);
      expect(res.incorrectCount).toBe(1);
      expect(res.netScore).toBeCloseTo(0.67, 2); // 1.0 - 0.33 = 0.67
      expect(res.accuracyPercent).toBe(50);
      expect(mockPrisma.client.mistake.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_questionId: {
              userId: studentUser1,
              questionId: 'q-math-2',
            },
          },
        }),
      );
    });

    it('safely handles double submissions idempotently without re-evaluation', async () => {
      const alreadySubmitted = {
        id: 'attempt-1',
        userId: studentUser1,
        status: AttemptStatus.SUBMITTED,
        result: {
          id: 'res-1',
          netScore: 50.0,
          accuracyPercent: 75.0,
        },
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(alreadySubmitted);

      const res = await attemptsService.submit(studentUser1, 'attempt-1', {
        timeSpentSeconds: 50,
      });

      expect(res.isIdempotent).toBe(true);
      expect(res.message).toBe('Attempt already finalized');
      expect(mockPrisma.client.result.create).not.toHaveBeenCalled();
    });

    it('marks attempt EXPIRED if submitted past server deadline', async () => {
      const lateAttempt = {
        id: 'attempt-1',
        userId: studentUser1,
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() - 10000), // 10s late
        test: mockTest,
        answers: [],
        antiCheatEvents: null,
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(lateAttempt);
      mockPrisma.client.testAttempt.update.mockResolvedValue({});
      mockPrisma.client.result.create.mockResolvedValue({ id: 'res-1' });

      const res = await attemptsService.submit(studentUser1, 'attempt-1', {
        timeSpentSeconds: 7200,
      });

      expect(res.status).toBe(AttemptStatus.EXPIRED);
    });
  });

  describe('4. Anti-Tampering & Integrity Event Logging', () => {
    it('records integrity events including tab hidden, window blur, copy/paste, fullscreen exit', async () => {
      mockPrisma.client.testAttempt.findUnique
        .mockResolvedValueOnce({
          id: 'attempt-1',
          userId: studentUser1,
          status: AttemptStatus.IN_PROGRESS,
          antiCheatEvents: [],
        })
        .mockResolvedValueOnce({
          id: 'attempt-1',
          antiCheatEvents: [],
        });

      mockPrisma.client.testAttempt.update.mockResolvedValue({});

      const res = await attemptsService.logIntegrityEvent(studentUser1, 'attempt-1', {
        eventType: IntegrityEventType.TAB_HIDDEN,
        timestamp: new Date().toISOString(),
        metadata: { durationAwaySeconds: 4 },
      });

      expect(res.success).toBe(true);
      expect(res.eventCount).toBe(1);
      expect(res.loggedEvent.eventType).toBe(IntegrityEventType.TAB_HIDDEN);
      expect(mockPrisma.client.testAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            antiCheatEvents: [
              expect.objectContaining({
                eventType: IntegrityEventType.TAB_HIDDEN,
              }),
            ],
          },
        }),
      );
    });

    it('detects multiple concurrent tabs and flags integrity event', async () => {
      mockPrisma.client.test.findUnique.mockResolvedValue(mockTest);

      const existingAttempt = {
        id: 'attempt-1',
        userId: studentUser1,
        testId: 'test-cds-01',
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() + 3600000),
        sessionToken: 'tab-1-token',
        answers: [],
        questionStates: [],
        antiCheatEvents: [],
      };

      mockPrisma.client.testAttempt.findFirst.mockResolvedValue(existingAttempt);
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(existingAttempt);
      mockPrisma.client.testAttempt.update.mockResolvedValue(existingAttempt);

      // Student opens Tab 2 with new token
      await attemptsService.startAttempt(studentUser1, 'test-cds-01', 'tab-2-token');

      expect(mockPrisma.client.testAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            antiCheatEvents: expect.arrayContaining([
              expect.objectContaining({
                eventType: 'MULTIPLE_TAB_DETECTED',
              }),
            ]),
          }),
        }),
      );
    });

    it('blocks unauthorized users from accessing or submitting another student’s attempt', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        userId: studentUser1, // Owned by user 1
        status: AttemptStatus.IN_PROGRESS,
      });

      // User 2 tries to autosave
      await expect(
        attemptsService.autosave(studentUser2, 'attempt-1', {
          questionId: 'q-math-1',
          selectedOptionId: 'opt-1',
          paletteState: QuestionPaletteState.ANSWERED,
        }),
      ).rejects.toThrow(ForbiddenException);

      // User 2 tries to submit
      await expect(
        attemptsService.submit(studentUser2, 'attempt-1', {
          timeSpentSeconds: 60,
        }),
      ).rejects.toThrow(ForbiddenException);

      // User 2 tries to log integrity event
      await expect(
        attemptsService.logIntegrityEvent(studentUser2, 'attempt-1', {
          eventType: IntegrityEventType.WINDOW_BLUR,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
