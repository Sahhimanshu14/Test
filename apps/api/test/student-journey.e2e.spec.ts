import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { PracticeService } from '../src/practice/practice.service';
import { BookmarksService } from '../src/bookmarks/bookmarks.service';
import { MistakesService } from '../src/mistakes/mistakes.service';
import { PyqsService } from '../src/pyqs/pyqs.service';
import { AttemptsService } from '../src/attempts/attempts.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RoleType, AcademyTarget, PracticeMode, AttemptStatus, MistakeStatus } from '@cdsprep/types';
import * as argon2 from 'argon2';

describe('Phase 10 — Complete Student Experience Full E2E Workflow', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let analyticsService: AnalyticsService;
  let practiceService: PracticeService;
  let bookmarksService: BookmarksService;
  let mistakesService: MistakesService;
  let pyqsService: PyqsService;
  let attemptsService: AttemptsService;

  let mockPrisma: any;
  let mockJwt: any;

  // In-memory student state to simulate real DB progression across the journey
  const studentId = 'student-cadet-007';
  let studentRecord: any;
  let mistakeRecord: any = null;
  let bookmarkRecord: any = null;

  beforeEach(async () => {
    studentRecord = null;
    mistakeRecord = null;
    bookmarkRecord = null;

    mockJwt = {
      signAsync: vi.fn().mockResolvedValue('mocked.jwt.token'),
      verifyAsync: vi.fn(),
    };

    mockPrisma = {
      client: {
        $transaction: vi.fn().mockImplementation(async (cb) => {
          if (typeof cb === 'function') return cb(mockPrisma.client);
          if (Array.isArray(cb)) return Promise.all(cb);
          return cb;
        }),
        user: {
          findUnique: vi.fn().mockImplementation(({ where }) => {
            if (studentRecord && (where.email === studentRecord.email || where.id === studentRecord.id)) {
              return Promise.resolve({ ...studentRecord });
            }
            return Promise.resolve(null);
          }),
          create: vi.fn().mockImplementation(({ data, select }) => {
            studentRecord = {
              id: studentId,
              ...data,
              isEmailVerified: true,
              currentStreak: 0,
              highestStreak: 0,
              lastActiveDate: null,
              preferences: null,
              refreshTokenHash: null,
              roles: [{ role: { name: RoleType.STUDENT, permissions: [] } }],
            };
            if (select) {
              const res: any = {};
              for (const k of Object.keys(select)) {
                if (select[k]) res[k] = studentRecord[k];
              }
              return Promise.resolve(res);
            }
            return Promise.resolve({ ...studentRecord });
          }),
          update: vi.fn().mockImplementation(({ where, data }) => {
            studentRecord = { ...studentRecord, ...data };
            return Promise.resolve({ ...studentRecord });
          }),
        },
        role: {
          findUnique: vi.fn().mockResolvedValue({ id: 'role-student', name: RoleType.STUDENT }),
        },
        userRole: {
          create: vi.fn().mockResolvedValue({ userId: studentId, roleId: 'role-student' }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        },
        result: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn(),
        },
        resultSubject: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        resultTopic: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        mistake: {
          count: vi.fn().mockImplementation(() => Promise.resolve(mistakeRecord ? 1 : 0)),
          findUnique: vi.fn().mockImplementation(() => Promise.resolve(mistakeRecord)),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(mistakeRecord ? [mistakeRecord] : [])),
          upsert: vi.fn().mockImplementation(({ create, update }) => {
            mistakeRecord = { ...(mistakeRecord || create), ...update, id: 'mistake-01' };
            return Promise.resolve(mistakeRecord);
          }),
          update: vi.fn().mockImplementation(({ data }) => {
            mistakeRecord = { ...mistakeRecord, ...data };
            return Promise.resolve(mistakeRecord);
          }),
        },
        bookmark: {
          count: vi.fn().mockImplementation(() => Promise.resolve(bookmarkRecord ? 1 : 0)),
          findUnique: vi.fn().mockImplementation(() => Promise.resolve(bookmarkRecord)),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(bookmarkRecord ? [bookmarkRecord] : [])),
          create: vi.fn().mockImplementation(({ data }) => {
            bookmarkRecord = { ...data, id: 'bm-01', createdAt: new Date() };
            return Promise.resolve(bookmarkRecord);
          }),
          delete: vi.fn().mockImplementation(() => {
            bookmarkRecord = null;
            return Promise.resolve({ id: 'bm-01' });
          }),
        },
        practiceSession: {
          create: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
          aggregate: vi.fn().mockResolvedValue({ _sum: { totalTimeSpentSeconds: 180 } }),
        },
        practiceAnswer: {
          findUnique: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn(),
          update: vi.fn(),
          count: vi.fn().mockResolvedValue(5),
        },
        testAttempt: {
          create: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
          count: vi.fn().mockResolvedValue(1),
          aggregate: vi.fn().mockResolvedValue({ _sum: { timeSpentSeconds: 3600 } }),
        },
        attemptAnswer: {
          upsert: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(10),
        },
        attemptQuestionState: {
          upsert: vi.fn(),
        },
        test: {
          findUnique: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        pyqPaper: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
        },
        pYQPaper: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
        },
        question: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
        },
        questionOption: {
          findFirst: vi.fn(),
        },
      },
    };

    authService = new AuthService(mockPrisma as unknown as PrismaService, mockJwt as unknown as JwtService);
    usersService = new UsersService(mockPrisma as unknown as PrismaService);
    analyticsService = new AnalyticsService(mockPrisma as unknown as PrismaService);
    practiceService = new PracticeService(mockPrisma as unknown as PrismaService);
    bookmarksService = new BookmarksService(mockPrisma as unknown as PrismaService);
    mistakesService = new MistakesService(mockPrisma as unknown as PrismaService);
    pyqsService = new PyqsService(mockPrisma as unknown as PrismaService);
    attemptsService = new AttemptsService(mockPrisma as unknown as PrismaService);
  });

  it('successfully executes the full 13-stage integrated cadet journey', async () => {
    // ----------------------------------------------------
    // STAGE 1: Registration
    // ----------------------------------------------------
    const regResult = await authService.register({
      email: 'cadet.vikram@cdsprep.in',
      password: 'CadetSecure@2026',
      fullName: 'Vikram Batra',
      targetAcademy: AcademyTarget.IMA,
    });
    expect(regResult.user).toBeDefined();
    expect(regResult.user.email).toBe('cadet.vikram@cdsprep.in');
    expect((regResult.user as any).passwordHash).toBeUndefined();

    // ----------------------------------------------------
    // STAGE 2: Login
    // ----------------------------------------------------
    const loginResult = await authService.login({
      email: 'cadet.vikram@cdsprep.in',
      password: 'CadetSecure@2026',
    });
    expect(loginResult.tokens.accessToken).toBe('mocked.jwt.token');
    expect(loginResult.user.fullName).toBe('Vikram Batra');

    // ----------------------------------------------------
    // STAGE 3: Dashboard & Daily Goals
    // ----------------------------------------------------
    const dashboard = await analyticsService.getStudentDashboardSummary(studentId);
    expect(dashboard).toBeDefined();
    expect(dashboard.dailyGoals).toBeDefined();
    expect(dashboard.dailyGoals.questions.target).toBe(30);
    expect(dashboard.dailyGoals.tests.target).toBe(1);
    expect(dashboard.studyPlan).toBeDefined();

    // ----------------------------------------------------
    // STAGE 4 & 5: Practice Engine & Answer Submission
    // ----------------------------------------------------
    const sampleQuestion = {
      id: 'q-trig-01',
      questionText: 'What is $\\sin^2 \\theta + \\cos^2 \\theta$?',
      marks: 1.0,
      negativeMarks: 0.33,
      options: [
        { id: 'opt-trig-1', identifier: 'A', optionText: '$1$', isCorrect: true },
        { id: 'opt-trig-2', identifier: 'B', optionText: '$0$', isCorrect: false },
      ],
      explanation: { explanation: 'Pythagorean trigonometric identity equals 1.' },
    };

    mockPrisma.client.practiceSession.findUnique.mockResolvedValue({
      id: 'session-01',
      userId: studentId,
      isCompleted: false,
    });
    mockPrisma.client.practiceAnswer.findUnique.mockResolvedValue({
      id: 'pa-01',
      sessionId: 'session-01',
      questionId: 'q-trig-01',
    });
    mockPrisma.client.questionOption.findFirst.mockResolvedValue(sampleQuestion.options[0]);
    mockPrisma.client.question.findUnique.mockResolvedValue(sampleQuestion);
    mockPrisma.client.practiceAnswer.update.mockResolvedValue({
      id: 'pa-01',
      selectedOptionId: 'opt-trig-1',
      isCorrect: true,
      timeSpentSeconds: 22,
    });

    const answerRes = await practiceService.submitAnswer(studentId, 'session-01', {
      questionId: 'q-trig-01',
      selectedOptionId: 'opt-trig-1',
      timeSpentSeconds: 22,
    });
    expect(answerRes.success).toBe(true);
    expect(answerRes.isCorrect).toBe(true);

    // ----------------------------------------------------
    // STAGE 6: Practice Session Finalization (Result)
    // ----------------------------------------------------
    mockPrisma.client.practiceSession.findUnique.mockResolvedValue({
      id: 'session-01',
      userId: studentId,
      isCompleted: false,
      answers: [
        {
          id: 'pa-01',
          questionId: 'q-trig-01',
          selectedOptionId: 'opt-trig-1',
          isCorrect: true,
          timeSpentSeconds: 22,
          question: sampleQuestion,
        },
      ],
    });
    mockPrisma.client.practiceSession.update.mockResolvedValue({ id: 'session-01', isCompleted: true });

    const completeRes = await practiceService.completeSession(studentId, 'session-01');
    expect(completeRes.metrics).toBeDefined();
    expect(completeRes.metrics.correctCount).toBe(1);

    // ----------------------------------------------------
    // STAGE 7: Bookmarks Management
    // ----------------------------------------------------
    const bmToggle = await bookmarksService.toggleBookmark(studentId, 'q-trig-01', 'Key formula');
    expect(bmToggle.isBookmarked).toBe(true);

    const bms = await bookmarksService.listBookmarks(studentId);
    expect(bms).toHaveLength(1);

    const bmRemove = await bookmarksService.removeBookmark(studentId, 'q-trig-01');
    expect(bmRemove.success).toBe(true);

    // ----------------------------------------------------
    // STAGE 8: Mistake Notebook & Mastery
    // ----------------------------------------------------
    // Simulate user answering a question wrong
    await mockPrisma.client.mistake.upsert({
      create: {
        userId: studentId,
        questionId: 'q-history-01',
        status: MistakeStatus.ACTIVE,
        failedCount: 1,
        question: {
          id: 'q-history-01',
          questionText: 'Battle of Plassey took place in which year?',
          options: [
            { id: 'opt-h-1', identifier: 'A', optionText: '1757', isCorrect: true },
            { id: 'opt-h-2', identifier: 'B', optionText: '1764', isCorrect: false },
          ],
        },
      },
      update: {},
    });

    const mistakes = await mistakesService.listMistakes(studentId, MistakeStatus.ACTIVE);
    expect(mistakes).toHaveLength(1);

    const masteredRes = await mistakesService.markMastered(studentId, 'mistake-01');
    expect(masteredRes.status).toBe(MistakeStatus.MASTERED);

    // ----------------------------------------------------
    // STAGE 9: PYQ Retrieval
    // ----------------------------------------------------
    mockPrisma.client.pYQPaper.findMany.mockResolvedValue([
      {
        id: 'pyq-paper-2024-1',
        year: 2024,
        session: 'CDS_1',
        paperType: 'ELEMENTARY_MATHEMATICS',
        title: 'CDS-I 2024 Elementary Mathematics Official Paper',
        totalQuestions: 100,
        totalMarks: 100,
        _count: { questions: 100 },
      },
    ]);

    const pyqPapers = await pyqsService.listPapers({ year: 2024 });
    expect(pyqPapers).toHaveLength(1);
    expect(pyqPapers[0].year).toBe(2024);

    // ----------------------------------------------------
    // STAGE 10: Mock Exam Attempt & Server Autoritative Submission
    // ----------------------------------------------------
    mockPrisma.client.test.findUnique.mockResolvedValue({
      id: 'test-full-01',
      title: 'CDS Full Mock 01',
      durationMinutes: 120,
      totalMarks: 100,
      passingMarks: 50,
      isPublished: true,
      sections: [
        {
          name: 'Elementary Mathematics',
          testQuestions: [
            {
              question: {
                id: 'q-trig-01',
                marks: 1.0,
                negativeMarks: 0.33,
                options: [
                  { id: 'opt-trig-1', isCorrect: true },
                  { id: 'opt-trig-2', isCorrect: false },
                ],
                subject: { name: 'Elementary Mathematics' },
                topic: { name: 'Trigonometry' },
              },
            },
          ],
        },
      ],
    });

    mockPrisma.client.testAttempt.create.mockResolvedValue({
      id: 'attempt-mock-01',
      userId: studentId,
      testId: 'test-full-01',
      status: AttemptStatus.STARTED,
      expiresAt: new Date(Date.now() + 7200000),
    });

    const startExam = await attemptsService.startAttempt(studentId, 'test-full-01');
    expect(startExam.attempt.id).toBe('attempt-mock-01');

    mockPrisma.client.testAttempt.findUnique.mockResolvedValue({
      id: 'attempt-mock-01',
      userId: studentId,
      status: AttemptStatus.IN_PROGRESS,
      expiresAt: new Date(Date.now() + 7200000),
      test: {
        sections: [
          {
            testQuestions: [
              {
                question: {
                  id: 'q-trig-01',
                  marks: 1.0,
                  negativeMarks: 0.33,
                  options: [
                    { id: 'opt-trig-1', isCorrect: true },
                    { id: 'opt-trig-2', isCorrect: false },
                  ],
                  subject: { name: 'Elementary Mathematics' },
                  topic: { name: 'Trigonometry' },
                },
              },
            ],
          },
        ],
      },
      answers: [
        {
          questionId: 'q-trig-01',
          selectedOptionId: 'opt-trig-1',
          timeSpentSeconds: 45,
        },
      ],
      result: null,
    });

    mockPrisma.client.result.create.mockResolvedValue({
      id: 'res-mock-01',
      netScore: 1.0,
      accuracyPercent: 100,
    });

    const submitExam = await attemptsService.submit(studentId, 'attempt-mock-01', {
      timeSpentSeconds: 45,
    });
    expect(submitExam.netScore).toBe(1.0);
    expect(submitExam.accuracyPercent).toBe(100);

    // ----------------------------------------------------
    // STAGE 11: Analytics & Diagnostic Breakdown
    // ----------------------------------------------------
    mockPrisma.client.resultSubject.findMany.mockResolvedValue([
      {
        subjectName: 'Elementary Mathematics',
        totalQuestions: 1,
        correctCount: 1,
        incorrectCount: 0,
        netScore: '1.0',
        accuracyPercent: '100.0',
      },
    ]);

    const subjectAnalytics = await analyticsService.getSubjectAnalytics(studentId);
    expect(subjectAnalytics.hasData).toBe(true);
    expect(subjectAnalytics.subjects[0].subjectName).toBe('Elementary Mathematics');

    // ----------------------------------------------------
    // STAGE 12: Candidate Profile & Preferences
    // ----------------------------------------------------
    const profileUpdate = await usersService.updateProfile(studentId, {
      fullName: 'Major Vikram Batra, PVC',
      targetAcademy: AcademyTarget.IMA,
    });
    expect(profileUpdate.fullName).toBe('Major Vikram Batra, PVC');

    const prefsUpdate = await usersService.updatePreferences(studentId, {
      dailyStreakReminder: true,
      autoAdvanceOnSelect: true,
    });
    expect(prefsUpdate.preferences).toMatchObject({
      dailyStreakReminder: true,
      autoAdvanceOnSelect: true,
    });

    // ----------------------------------------------------
    // STAGE 13: Logout
    // ----------------------------------------------------
    const logoutRes = await authService.logout(studentId);
    expect(logoutRes.message).toBe('Logged out successfully');
    expect(studentRecord.refreshTokenHash).toBeNull();
  });
});
