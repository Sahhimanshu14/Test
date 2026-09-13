import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PracticeService } from '../src/practice/practice.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PracticeMode, DifficultyLevel, MistakeStatus, QuestionStatus } from '@cdsprep/types';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Phase 7 — Practice Engine & Backend Authority Suite', () => {
  let practiceService: PracticeService;
  let mockPrisma: any;

  const studentUser1 = 'user-student-1';
  const studentUser2 = 'user-student-2';

  const mockQuestions = [
    {
      id: 'q-1',
      questionType: 'MCQ_SINGLE',
      questionText: 'What is the speed of light?',
      marks: 2.0,
      negativeMarks: 0.66,
      difficulty: 'EASY',
      status: QuestionStatus.PUBLISHED,
      subjectId: 'sub-gk',
      chapterId: 'chap-physics',
      topicId: 'top-optics',
      year: 2022,
      options: [
        { id: 'opt-1-a', identifier: 'A', optionText: '3 x 10^8 m/s', isCorrect: true, orderIndex: 0 },
        { id: 'opt-1-b', identifier: 'B', optionText: '3 x 10^6 m/s', isCorrect: false, orderIndex: 1 },
      ],
      explanation: { id: 'exp-1', explanation: 'Speed of light in vacuum is approximately 3e8 m/s.' },
    },
    {
      id: 'q-2',
      questionType: 'MCQ_SINGLE',
      questionText: 'Find the derivative of sin(x).',
      marks: 3.0,
      negativeMarks: 1.0,
      difficulty: 'MEDIUM',
      status: QuestionStatus.PUBLISHED,
      subjectId: 'sub-maths',
      chapterId: 'chap-calculus',
      topicId: 'top-derivatives',
      year: null,
      options: [
        { id: 'opt-2-a', identifier: 'A', optionText: 'cos(x)', isCorrect: true, orderIndex: 0 },
        { id: 'opt-2-b', identifier: 'B', optionText: '-cos(x)', isCorrect: false, orderIndex: 1 },
      ],
      explanation: { id: 'exp-2', explanation: 'd/dx[sin(x)] = cos(x).' },
    },
    {
      id: 'q-3',
      questionType: 'MCQ_SINGLE',
      questionText: 'Identify the antonym of Diligent.',
      marks: 1.0,
      negativeMarks: 0.33,
      difficulty: 'HARD',
      status: QuestionStatus.PUBLISHED,
      subjectId: 'sub-english',
      chapterId: 'chap-vocab',
      topicId: 'top-antonyms',
      year: 2021,
      options: [
        { id: 'opt-3-a', identifier: 'A', optionText: 'Lazy', isCorrect: true, orderIndex: 0 },
        { id: 'opt-3-b', identifier: 'B', optionText: 'Careful', isCorrect: false, orderIndex: 1 },
      ],
      explanation: { id: 'exp-3', explanation: 'Lazy is opposite to diligent.' },
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      client: {
        question: {
          findMany: vi.fn(),
          findUnique: vi.fn(),
        },
        questionOption: {
          findFirst: vi.fn(),
        },
        practiceSession: {
          create: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
        },
        practiceAnswer: {
          createMany: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        mistake: {
          findUnique: vi.fn(),
          upsert: vi.fn(),
          update: vi.fn(),
        },
        questionReport: {
          create: vi.fn(),
        },
        user: {
          update: vi.fn(),
        },
        $transaction: vi.fn(async (cb) => {
          if (typeof cb === 'function') {
            return cb(mockPrisma.client);
          }
          return cb;
        }),
      },
    };

    practiceService = new PracticeService(mockPrisma as unknown as PrismaService);
  });

  describe('1. Practice Modes & Question Selection', () => {
    it('creates an ALL_QUESTIONS practice session and returns sanitized questions without isCorrect', async () => {
      mockPrisma.client.question.findMany.mockResolvedValue([
        { id: 'q-1' },
        { id: 'q-2' },
      ]);

      const createdSession = {
        id: 'session-1',
        userId: studentUser1,
        mode: PracticeMode.ALL_QUESTIONS,
        questionCount: 2,
        randomize: false,
        isCompleted: false,
        score: 0,
        negativeMarks: 0,
        correctCount: 0,
        incorrectCount: 0,
        unattemptedCount: 0,
        totalTimeSpentSeconds: 0,
        startedAt: new Date(),
        completedAt: null,
      };

      mockPrisma.client.practiceSession.create.mockResolvedValue(createdSession);
      mockPrisma.client.practiceAnswer.createMany.mockResolvedValue({ count: 2 });

      mockPrisma.client.practiceSession.findUnique.mockResolvedValue({
        ...createdSession,
        answers: [
          {
            id: 'pa-1',
            questionId: 'q-1',
            selectedOptionId: null,
            isCorrect: null,
            timeSpentSeconds: 0,
            isMarkedForReview: false,
            orderIndex: 0,
            answeredAt: null,
            question: mockQuestions[0],
          },
          {
            id: 'pa-2',
            questionId: 'q-2',
            selectedOptionId: null,
            isCorrect: null,
            timeSpentSeconds: 0,
            isMarkedForReview: false,
            orderIndex: 1,
            answeredAt: null,
            question: mockQuestions[1],
          },
        ],
      });

      const res = await practiceService.createSession(studentUser1, {
        mode: PracticeMode.ALL_QUESTIONS,
        questionCount: 2,
        randomize: false,
      });

      expect(res.session.id).toBe('session-1');
      expect(res.answers).toHaveLength(2);
      // Ensure isCorrect is NOT leaked to student before submission
      expect(res.answers[0].isCorrect).toBeNull();
      expect(res.answers[0].question.options[0].isCorrect).toBeUndefined();
      expect(res.answers[0].question.explanation).toBeNull();
    });

    it('enforces required filters for SUBJECT, CHAPTER, TOPIC, and DIFFICULTY modes', async () => {
      await expect(
        practiceService.createSession(studentUser1, { mode: PracticeMode.SUBJECT }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        practiceService.createSession(studentUser1, { mode: PracticeMode.CHAPTER }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        practiceService.createSession(studentUser1, { mode: PracticeMode.TOPIC }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        practiceService.createSession(studentUser1, { mode: PracticeMode.DIFFICULTY }),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles empty questions scenario with descriptive exception', async () => {
      mockPrisma.client.question.findMany.mockResolvedValue([]);

      await expect(
        practiceService.createSession(studentUser1, {
          mode: PracticeMode.BOOKMARKS,
        }),
      ).rejects.toThrow('You do not have any bookmarked questions to practice yet.');
    });
  });

  describe('2. Answer Submission & Backend Authority', () => {
    const activeSession = {
      id: 'session-1',
      userId: studentUser1,
      isCompleted: false,
      enableNegativeMarking: true,
      timeLimitMinutes: 30,
      answers: [],
    };

    it('authoritatively checks answer correctness and saves valid response', async () => {
      mockPrisma.client.practiceSession.findUnique.mockResolvedValue(activeSession);
      mockPrisma.client.practiceAnswer.findUnique.mockResolvedValue({
        id: 'pa-1',
        sessionId: 'session-1',
        questionId: 'q-1',
      });
      mockPrisma.client.questionOption.findFirst.mockResolvedValue({
        id: 'opt-1-a',
        questionId: 'q-1',
        isCorrect: true,
      });
      mockPrisma.client.practiceAnswer.update.mockResolvedValue({
        id: 'pa-1',
        selectedOptionId: 'opt-1-a',
        isCorrect: true,
        timeSpentSeconds: 25,
      });
      mockPrisma.client.mistake.findUnique.mockResolvedValue(null);
      mockPrisma.client.question.findUnique.mockResolvedValue(mockQuestions[0]);

      const result = await practiceService.submitAnswer(studentUser1, 'session-1', {
        questionId: 'q-1',
        selectedOptionId: 'opt-1-a',
        timeSpentSeconds: 25,
        isMarkedForReview: false,
      });

      expect(result.success).toBe(true);
      expect(result.isCorrect).toBe(true);
      expect(mockPrisma.client.practiceAnswer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            selectedOptionId: 'opt-1-a',
            isCorrect: true,
          }),
        }),
      );
    });

    it('supports clearing an answer by passing null selectedOptionId', async () => {
      mockPrisma.client.practiceSession.findUnique.mockResolvedValue(activeSession);
      mockPrisma.client.practiceAnswer.findUnique.mockResolvedValue({
        id: 'pa-1',
        sessionId: 'session-1',
        questionId: 'q-1',
      });
      mockPrisma.client.practiceAnswer.update.mockResolvedValue({
        id: 'pa-1',
        selectedOptionId: null,
        isCorrect: null,
      });

      const result = await practiceService.submitAnswer(studentUser1, 'session-1', {
        questionId: 'q-1',
        selectedOptionId: null,
        timeSpentSeconds: 5,
        isMarkedForReview: true,
      });

      expect(result.success).toBe(true);
      expect(result.cleared).toBe(true);
      expect(mockPrisma.client.practiceAnswer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            selectedOptionId: null,
            isCorrect: null,
          }),
        }),
      );
    });

    it('rejects answer submission for option not belonging to the question', async () => {
      mockPrisma.client.practiceSession.findUnique.mockResolvedValue(activeSession);
      mockPrisma.client.practiceAnswer.findUnique.mockResolvedValue({
        id: 'pa-1',
        sessionId: 'session-1',
        questionId: 'q-1',
      });
      mockPrisma.client.questionOption.findFirst.mockResolvedValue(null);

      await expect(
        practiceService.submitAnswer(studentUser1, 'session-1', {
          questionId: 'q-1',
          selectedOptionId: 'invalid-opt-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Automatic Mistake Notebook Synchronization', () => {
    const activeSession = {
      id: 'session-1',
      userId: studentUser1,
      isCompleted: false,
    };

    it('automatically upserts Mistake notebook record on wrong answer', async () => {
      mockPrisma.client.practiceSession.findUnique.mockResolvedValue(activeSession);
      mockPrisma.client.practiceAnswer.findUnique.mockResolvedValue({
        id: 'pa-1',
        sessionId: 'session-1',
        questionId: 'q-1',
      });
      mockPrisma.client.questionOption.findFirst.mockResolvedValue({
        id: 'opt-1-b',
        questionId: 'q-1',
        isCorrect: false,
      });
      mockPrisma.client.practiceAnswer.update.mockResolvedValue({
        id: 'pa-1',
        selectedOptionId: 'opt-1-b',
        isCorrect: false,
      });
      mockPrisma.client.mistake.upsert.mockResolvedValue({});
      mockPrisma.client.question.findUnique.mockResolvedValue(mockQuestions[0]);

      const res = await practiceService.submitAnswer(studentUser1, 'session-1', {
        questionId: 'q-1',
        selectedOptionId: 'opt-1-b',
      });

      expect(res.isCorrect).toBe(false);
      expect(mockPrisma.client.mistake.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_questionId: {
              userId: studentUser1,
              questionId: 'q-1',
            },
          },
          update: expect.objectContaining({
            status: MistakeStatus.ACTIVE,
            failedCount: { increment: 1 },
          }),
        }),
      );
    });

    it('updates active mistake to RETRY_CORRECT when student re-attempts and gets it right', async () => {
      mockPrisma.client.practiceSession.findUnique.mockResolvedValue(activeSession);
      mockPrisma.client.practiceAnswer.findUnique.mockResolvedValue({
        id: 'pa-1',
        sessionId: 'session-1',
        questionId: 'q-1',
      });
      mockPrisma.client.questionOption.findFirst.mockResolvedValue({
        id: 'opt-1-a',
        questionId: 'q-1',
        isCorrect: true,
      });
      mockPrisma.client.practiceAnswer.update.mockResolvedValue({
        id: 'pa-1',
        selectedOptionId: 'opt-1-a',
        isCorrect: true,
      });
      mockPrisma.client.mistake.findUnique.mockResolvedValue({
        id: 'mistake-1',
        status: MistakeStatus.ACTIVE,
      });
      mockPrisma.client.mistake.update.mockResolvedValue({});
      mockPrisma.client.question.findUnique.mockResolvedValue(mockQuestions[0]);

      const res = await practiceService.submitAnswer(studentUser1, 'session-1', {
        questionId: 'q-1',
        selectedOptionId: 'opt-1-a',
      });

      expect(res.isCorrect).toBe(true);
      expect(mockPrisma.client.mistake.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mistake-1' },
          data: { status: MistakeStatus.RETRY_CORRECT },
        }),
      );
    });
  });

  describe('4. Scoring, Negative Marking & Session Finalization', () => {
    it('accurately computes score with negative marking enabled', async () => {
      const sessionWithAnswers = {
        id: 'session-1',
        userId: studentUser1,
        isCompleted: false,
        enableNegativeMarking: true,
        answers: [
          {
            selectedOptionId: 'opt-1-a',
            isCorrect: true,
            timeSpentSeconds: 30,
            question: mockQuestions[0], // marks: 2.0
          },
          {
            selectedOptionId: 'opt-2-b',
            isCorrect: false,
            timeSpentSeconds: 40,
            question: mockQuestions[1], // negativeMarks: 1.0
          },
          {
            selectedOptionId: null,
            isCorrect: null,
            timeSpentSeconds: 10,
            question: mockQuestions[2], // skipped
          },
        ],
      };

      mockPrisma.client.practiceSession.findUnique.mockResolvedValue(sessionWithAnswers);
      mockPrisma.client.practiceSession.update.mockResolvedValue({});
      mockPrisma.client.user.update.mockResolvedValue({});

      // Mock getSession call return
      vi.spyOn(practiceService, 'getSession').mockResolvedValue({
        session: { id: 'session-1', isCompleted: true } as any,
        answers: [] as any,
      });

      const result = await practiceService.completeSession(studentUser1, 'session-1');

      expect(result.metrics).toEqual({
        totalQuestions: 3,
        attemptedCount: 2,
        correctCount: 1,
        incorrectCount: 1,
        unattemptedCount: 1,
        grossMarks: 2.0,
        negativeMarks: 1.0,
        netScore: 1.0, // 2.0 - 1.0 = 1.0
        accuracyPercent: 50.0,
        totalTimeSpentSeconds: 80,
      });
    });

    it('does NOT deduct negative marks when enableNegativeMarking is false', async () => {
      const sessionWithoutNegativeMarking = {
        id: 'session-2',
        userId: studentUser1,
        isCompleted: false,
        enableNegativeMarking: false,
        answers: [
          {
            selectedOptionId: 'opt-1-a',
            isCorrect: true,
            timeSpentSeconds: 20,
            question: mockQuestions[0], // marks: 2.0
          },
          {
            selectedOptionId: 'opt-2-b',
            isCorrect: false,
            timeSpentSeconds: 30,
            question: mockQuestions[1], // negativeMarks: 1.0 (should be ignored)
          },
        ],
      };

      mockPrisma.client.practiceSession.findUnique.mockResolvedValue(sessionWithoutNegativeMarking);
      mockPrisma.client.practiceSession.update.mockResolvedValue({});
      mockPrisma.client.user.update.mockResolvedValue({});

      vi.spyOn(practiceService, 'getSession').mockResolvedValue({
        session: { id: 'session-2', isCompleted: true } as any,
        answers: [] as any,
      });

      const result = await practiceService.completeSession(studentUser1, 'session-2');

      expect(result.metrics.negativeMarks).toBe(0);
      expect(result.metrics.netScore).toBe(2.0); // No deduction
    });
  });

  describe('5. Question Reporting & User Isolation Security', () => {
    it('creates a question report for academic review', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValue(mockQuestions[0]);
      mockPrisma.client.questionReport.create.mockResolvedValue({
        id: 'rep-1',
        status: 'PENDING',
      });

      const res = await practiceService.reportQuestion(studentUser1, {
        questionId: 'q-1',
        reason: 'INCORRECT_ANSWER_KEY',
        details: 'Option A should be correct',
      });

      expect(res.reportId).toBe('rep-1');
      expect(res.status).toBe('PENDING');
      expect(mockPrisma.client.questionReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: studentUser1,
            questionId: 'q-1',
            reason: 'INCORRECT_ANSWER_KEY',
          }),
        }),
      );
    });

    it('blocks student from accessing or modifying another student’s session', async () => {
      mockPrisma.client.practiceSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: studentUser1, // Owned by user 1
        isCompleted: false,
      });

      // User 2 attempts to get session
      await expect(
        practiceService.getSession(studentUser2, 'session-1'),
      ).rejects.toThrow(ForbiddenException);

      // User 2 attempts to submit answer
      await expect(
        practiceService.submitAnswer(studentUser2, 'session-1', {
          questionId: 'q-1',
          selectedOptionId: 'opt-1-a',
        }),
      ).rejects.toThrow(ForbiddenException);

      // User 2 attempts to complete session
      await expect(
        practiceService.completeSession(studentUser2, 'session-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks answer submission on completed session', async () => {
      mockPrisma.client.practiceSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: studentUser1,
        isCompleted: true, // Completed
      });

      await expect(
        practiceService.submitAnswer(studentUser1, 'session-1', {
          questionId: 'q-1',
          selectedOptionId: 'opt-1-a',
        }),
      ).rejects.toThrow('Cannot submit answers for a completed practice session');
    });
  });
});
