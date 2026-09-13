import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttemptsService } from '../src/attempts/attempts.service';
import { PracticeService } from '../src/practice/practice.service';
import { AttemptStatus, QuestionPaletteState, PracticeMode, MistakeStatus } from '@cdsprep/types';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Comprehensive Edge Cases & Failure Resiliency Suite', () => {
  const userId = 'cadet-user-01';
  const attackerUserId = 'malicious-user-02';
  const testId = 'test-cds-edge-01';
  const attemptId = 'attempt-edge-01';
  const sessionId = 'session-edge-01';

  let attemptsService: AttemptsService;
  let practiceService: PracticeService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      client: {
        test: {
          findUnique: vi.fn(),
        },
        testAttempt: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        attemptAnswer: {
          upsert: vi.fn(),
          findMany: vi.fn(),
        },
        attemptQuestionState: {
          upsert: vi.fn(),
        },
        result: {
          create: vi.fn(),
          findUnique: vi.fn(),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({
            currentStreak: 2,
            highestStreak: 5,
            lastActiveDate: new Date(),
          }),
          update: vi.fn(),
        },
        question: {
          findMany: vi.fn(),
        },
        practiceSession: {
          create: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        practiceAnswer: {
          upsert: vi.fn(),
        },
        mistake: {
          upsert: vi.fn(),
          findUnique: vi.fn(),
        },
        $transaction: vi.fn(async (ops: any[]) => {
          return Promise.all(
            ops.map((op) => (typeof op === 'function' ? op(mockPrisma.client) : op)),
          );
        }),
      },
    };

    attemptsService = new AttemptsService(mockPrisma);
    practiceService = new PracticeService(mockPrisma);
  });

  describe('1. Scoring & Negative Marking Precision Boundaries', () => {
    const createMockTestWithQuestions = (questions: any[]) => ({
      id: testId,
      title: 'CDS Edge Scoring Test',
      durationMinutes: 60,
      sections: [
        {
          id: 'sec-1',
          name: 'General Knowledge',
          testQuestions: questions.map((q, idx) => ({
            orderIndex: idx + 1,
            question: q,
          })),
        },
      ],
    });

    it('calculates score with 100% correct answers (no negative deduction)', async () => {
      const q1 = {
        id: 'q-1',
        marks: 1.0,
        negativeMarks: 0.33,
        options: [{ id: 'opt-1-correct', isCorrect: true }],
      };
      const q2 = {
        id: 'q-2',
        marks: 1.0,
        negativeMarks: 0.33,
        options: [{ id: 'opt-2-correct', isCorrect: true }],
      };

      const mockAttempt = {
        id: attemptId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() + 60000), // future
        test: createMockTestWithQuestions([q1, q2]),
        answers: [
          { questionId: 'q-1', selectedOptionId: 'opt-1-correct' },
          { questionId: 'q-2', selectedOptionId: 'opt-2-correct' },
        ],
        result: null,
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttempt);
      mockPrisma.client.testAttempt.update.mockResolvedValue({});
      mockPrisma.client.result.create.mockImplementation((args: any) => args.data);

      await attemptsService.submit(userId, attemptId, { timeSpentSeconds: 1200 });

      expect(mockPrisma.client.result.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalQuestions: 2,
            attemptedCount: 2,
            correctCount: 2,
            incorrectCount: 0,
            skippedCount: 0,
            grossMarks: 2.0,
            negativeMarks: 0,
            netScore: 2.0,
            accuracyPercent: 100,
          }),
        }),
      );
    });

    it('handles all-wrong answers: applies negative marking and clamps netScore to 0', async () => {
      const q1 = {
        id: 'q-1',
        marks: 1.0,
        negativeMarks: 0.33,
        options: [
          { id: 'opt-1-corr', isCorrect: true },
          { id: 'opt-1-wrong', isCorrect: false },
        ],
      };
      const q2 = {
        id: 'q-2',
        marks: 1.0,
        negativeMarks: 0.33,
        options: [
          { id: 'opt-2-corr', isCorrect: true },
          { id: 'opt-2-wrong', isCorrect: false },
        ],
      };

      const mockAttempt = {
        id: attemptId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() + 60000),
        test: createMockTestWithQuestions([q1, q2]),
        answers: [
          { questionId: 'q-1', selectedOptionId: 'opt-1-wrong' },
          { questionId: 'q-2', selectedOptionId: 'opt-2-wrong' },
        ],
        result: null,
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttempt);
      mockPrisma.client.testAttempt.update.mockResolvedValue({});
      mockPrisma.client.result.create.mockImplementation((args: any) => args.data);

      await attemptsService.submit(userId, attemptId, { timeSpentSeconds: 1200 });

      expect(mockPrisma.client.result.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalQuestions: 2,
            attemptedCount: 2,
            correctCount: 0,
            incorrectCount: 2,
            skippedCount: 0,
            grossMarks: 0,
            negativeMarks: 0.66,
            netScore: 0, // Clamped from -0.66
            accuracyPercent: 0,
          }),
        }),
      );
    });

    it('handles all-unanswered / all-skipped: 0 marks, 0 negative marks, 0 attempted', async () => {
      const q1 = {
        id: 'q-1',
        marks: 1.0,
        negativeMarks: 0.33,
        options: [{ id: 'opt-1-corr', isCorrect: true }],
      };

      const mockAttempt = {
        id: attemptId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() + 60000),
        test: createMockTestWithQuestions([q1]),
        answers: [], // Candidate answered nothing
        result: null,
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttempt);
      mockPrisma.client.testAttempt.update.mockResolvedValue({});
      mockPrisma.client.result.create.mockImplementation((args: any) => args.data);

      await attemptsService.submit(userId, attemptId, { timeSpentSeconds: 60 });

      expect(mockPrisma.client.result.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalQuestions: 1,
            attemptedCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            skippedCount: 1,
            grossMarks: 0,
            negativeMarks: 0,
            netScore: 0,
            accuracyPercent: 0,
          }),
        }),
      );
    });
  });

  describe('2. Authoritative Timer & Timeout Boundaries', () => {
    it('marks attempt status as EXPIRED when submitted past expiresAt', async () => {
      const mockAttempt = {
        id: attemptId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
        test: {
          sections: [],
        },
        answers: [],
        result: null,
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttempt);
      mockPrisma.client.testAttempt.update.mockResolvedValue({});
      mockPrisma.client.result.create.mockResolvedValue({});

      await attemptsService.submit(userId, attemptId, { timeSpentSeconds: 3600 });

      expect(mockPrisma.client.testAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AttemptStatus.EXPIRED,
          }),
        }),
      );
    });

    it('rejects autosave if attempt timer has expired on the server', async () => {
      const mockAttempt = {
        id: attemptId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() - 10000), // expired
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttempt);
      mockPrisma.client.testAttempt.update.mockResolvedValue({});

      await expect(
        attemptsService.autosave(userId, attemptId, {
          questionId: 'q-1',
          selectedOptionId: 'opt-1',
          paletteState: QuestionPaletteState.ANSWERED,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.client.testAttempt.update).toHaveBeenCalledWith({
        where: { id: attemptId },
        data: { status: AttemptStatus.EXPIRED },
      });
    });
  });

  describe('3. Double Submit & Idempotency Protection', () => {
    it('returns existing result idempotently on repeated submit without double-calculation', async () => {
      const mockResult = {
        id: 'result-1',
        netScore: 45.5,
        totalQuestions: 50,
      };

      const submittedAttempt = {
        id: attemptId,
        userId,
        status: AttemptStatus.SUBMITTED,
        result: mockResult,
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(submittedAttempt);

      const response = await attemptsService.submit(userId, attemptId, { timeSpentSeconds: 2000 });

      expect(response.isIdempotent).toBe(true);
      expect(response.status).toBe(AttemptStatus.SUBMITTED);
      expect(response.result).toEqual(mockResult);
      // Ensure no transaction or new result creation occurred
      expect(mockPrisma.client.result.create).not.toHaveBeenCalled();
    });

    it('rejects autosave on an already submitted attempt', async () => {
      const mockAttempt = {
        id: attemptId,
        userId,
        status: AttemptStatus.SUBMITTED,
        expiresAt: new Date(Date.now() + 60000),
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttempt);

      await expect(
        attemptsService.autosave(userId, attemptId, {
          questionId: 'q-1',
          selectedOptionId: 'opt-1',
          paletteState: QuestionPaletteState.ANSWERED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. IDOR & Access Control Edge Cases', () => {
    it('rejects autosave from non-owner user with ForbiddenException', async () => {
      const mockAttempt = {
        id: attemptId,
        userId, // belongs to cadet-user-01
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() + 60000),
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttempt);

      await expect(
        attemptsService.autosave(attackerUserId, attemptId, {
          questionId: 'q-1',
          selectedOptionId: 'opt-1',
          paletteState: QuestionPaletteState.ANSWERED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects submit from non-owner user with ForbiddenException', async () => {
      const mockAttempt = {
        id: attemptId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() + 60000),
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttempt);

      await expect(
        attemptsService.submit(attackerUserId, attemptId, { timeSpentSeconds: 100 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when submitting for a non-existent attempt', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(null);

      await expect(
        attemptsService.submit(userId, 'non-existent-attempt', { timeSpentSeconds: 100 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('5. Practice Edge Cases: Empty Pools & Required Filters', () => {
    it('throws BadRequestException when question candidate pool is empty', async () => {
      mockPrisma.client.question.findMany.mockResolvedValue([]);

      await expect(
        practiceService.createSession(userId, {
          mode: PracticeMode.ALL_QUESTIONS,
          questionCount: 10,
        }),
      ).rejects.toThrow('No questions found matching the selected practice criteria');
    });

    it('throws friendly message when bookmark practice pool is empty', async () => {
      mockPrisma.client.question.findMany.mockResolvedValue([]);

      await expect(
        practiceService.createSession(userId, {
          mode: PracticeMode.BOOKMARKS,
          questionCount: 10,
        }),
      ).rejects.toThrow('You do not have any bookmarked questions to practice yet.');
    });

    it('throws friendly message when mistake notebook practice pool is empty', async () => {
      mockPrisma.client.question.findMany.mockResolvedValue([]);

      await expect(
        practiceService.createSession(userId, {
          mode: PracticeMode.MISTAKES,
          questionCount: 10,
        }),
      ).rejects.toThrow('No active mistakes in your notebook to practice. Keep up the good work!');
    });

    it('enforces subjectId requirement for SUBJECT practice mode', async () => {
      await expect(
        practiceService.createSession(userId, {
          mode: PracticeMode.SUBJECT,
        }),
      ).rejects.toThrow('subjectId is required for SUBJECT practice mode');
    });

    it('enforces chapterId requirement for CHAPTER practice mode', async () => {
      await expect(
        practiceService.createSession(userId, {
          mode: PracticeMode.CHAPTER,
        }),
      ).rejects.toThrow('chapterId is required for CHAPTER practice mode');
    });
  });
});
