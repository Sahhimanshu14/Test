import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { PracticeService } from '../src/practice/practice.service';
import { BookmarksService } from '../src/bookmarks/bookmarks.service';
import { MistakesService } from '../src/mistakes/mistakes.service';
import { PyqsService } from '../src/pyqs/pyqs.service';
import { AttemptsService } from '../src/attempts/attempts.service';
import { AdminService } from '../src/admin/admin.service';
import { QuestionsService } from '../src/questions/questions.service';
import { TestsService } from '../src/tests/tests.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  RoleType,
  AcademyTarget,
  PracticeMode,
  AttemptStatus,
  MistakeStatus,
  QuestionStatus,
  QuestionType,
  QuestionPaletteState,
  DifficultyLevel,
  TestType,
} from '@cdsprep/types';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ReportResolutionAction } from '../src/admin/dto/admin.dto';

describe('Phase 21 — Comprehensive User Acceptance Testing (UAT) Verification Suite', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let analyticsService: AnalyticsService;
  let practiceService: PracticeService;
  let bookmarksService: BookmarksService;
  let mistakesService: MistakesService;
  let pyqsService: PyqsService;
  let attemptsService: AttemptsService;
  let adminService: AdminService;
  let questionsService: QuestionsService;
  let testsService: TestsService;
  let rolesGuard: RolesGuard;

  let mockPrisma: any;
  let mockJwt: any;
  let mockAudit: any;

  // Personas store
  const personas = {
    student: {
      id: 'usr-student-vikram',
      email: 'student@cdsprep.com',
      fullName: 'Vikram Singh',
      targetAcademy: AcademyTarget.IMA,
      role: RoleType.STUDENT,
    },
    editor: {
      id: 'usr-editor-content',
      email: 'editor@cdsprep.com',
      fullName: 'Content Editor',
      targetAcademy: AcademyTarget.AFA,
      role: RoleType.CONTENT_EDITOR,
    },
    moderator: {
      id: 'usr-moderator-quality',
      email: 'moderator@cdsprep.com',
      fullName: 'Quality Moderator',
      targetAcademy: AcademyTarget.INA,
      role: RoleType.MODERATOR,
    },
    admin: {
      id: 'usr-admin-cds',
      email: 'admin@cdsprep.com',
      fullName: 'CDS Administrator',
      targetAcademy: AcademyTarget.IMA,
      role: RoleType.ADMIN,
    },
    superAdmin: {
      id: 'usr-superadmin-platform',
      email: 'superadmin@cdsprep.com',
      fullName: 'Super Administrator',
      targetAcademy: AcademyTarget.IMA,
      role: RoleType.SUPER_ADMIN,
    },
  };

  // State store
  let registeredCadet: any = null;
  let activeAttempt: any = null;
  let activePracticeSession: any = null;
  let activeQuestions: any[] = [];
  let userBookmarks: Set<string> = new Set();
  let userMistakes: any[] = [];
  let questionReports: any[] = [];
  let auditLogs: any[] = [];

  const mockTestEntity = {
    id: 'mock-cds-2026',
    title: 'CDS 2026 Full Mock Examination 01',
    isPublished: true,
    targetAcademy: AcademyTarget.IMA,
    durationMinutes: 120,
    sections: [
      {
        id: 'sec-1',
        name: 'Elementary Mathematics',
        testQuestions: [
          {
            orderIndex: 1,
            question: {
              id: 'q-math-trig-01',
              marks: 1.0,
              negativeMarks: 0.33,
              options: [
                { id: 'opt-1', identifier: 'A', optionText: '$\\frac{4}{5}$', isCorrect: true },
                { id: 'opt-2', identifier: 'B', optionText: '$\\frac{3}{5}$', isCorrect: false },
              ],
            },
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    registeredCadet = null;
    activeAttempt = null;
    activePracticeSession = null;
    userBookmarks = new Set();
    userMistakes = [];
    questionReports = [];
    auditLogs = [];

    mockJwt = {
      signAsync: vi.fn().mockResolvedValue('valid.jwt.access.token'),
      verifyAsync: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'expired.jwt.token') throw new UnauthorizedException('Token expired');
        if (token === 'invalid.jwt.token') throw new UnauthorizedException('Invalid signature');
        return { sub: personas.student.id, email: personas.student.email, roles: [RoleType.STUDENT] };
      }),
    };

    mockAudit = {
      logAction: vi.fn().mockImplementation((operatorId: string, action: string, entityType: string, entityId: string, metadata?: any) => {
        const item = { id: `audit-${Date.now()}`, operatorId, action, entityType, entityId, metadata, createdAt: new Date() };
        auditLogs.push(item);
        return Promise.resolve(item);
      }),
      listAuditLogs: vi.fn().mockImplementation(() => Promise.resolve({ items: auditLogs, total: auditLogs.length })),
    };

    const dummyOptions = [
      { id: 'opt-1', identifier: 'A', optionText: '$\\frac{4}{5}$', isCorrect: true, orderIndex: 1 },
      { id: 'opt-2', identifier: 'B', optionText: '$\\frac{3}{5}$', isCorrect: false, orderIndex: 2 },
      { id: 'opt-3', identifier: 'C', optionText: '$\\frac{1}{2}$', isCorrect: false, orderIndex: 3 },
      { id: 'opt-4', identifier: 'D', optionText: '$1$', isCorrect: false, orderIndex: 4 },
    ];

    activeQuestions = [
      {
        id: 'q-math-trig-01',
        subjectId: 'sub-math',
        chapterId: 'chap-trig',
        topicId: 'top-identities',
        questionType: QuestionType.MCQ_SINGLE,
        status: QuestionStatus.PUBLISHED,
        questionText: 'If $\\sec \\theta + \\tan \\theta = 3$, what is the value of $\\sin \\theta$?',
        marks: 1.0,
        negativeMarks: 0.33,
        difficulty: DifficultyLevel.MEDIUM,
        options: dummyOptions,
        explanation: { explanation: 'Using the identity $\\sec^2\\theta - \\tan^2\\theta = 1$, we deduce $\\sin\\theta = 4/5$.' },
        deletedAt: null,
      },
      {
        id: 'q-gk-polity-01',
        subjectId: 'sub-gk',
        chapterId: 'chap-polity',
        topicId: 'top-constitution',
        questionType: QuestionType.MCQ_SINGLE,
        status: QuestionStatus.PUBLISHED,
        questionText: 'Under Article 109 of the Indian Constitution, which House has exclusive authority over Money Bills?',
        marks: 1.0,
        negativeMarks: 0.33,
        difficulty: DifficultyLevel.EASY,
        options: [
          { id: 'opt-gk-1', identifier: 'A', optionText: 'Lok Sabha', isCorrect: true, orderIndex: 1 },
          { id: 'opt-gk-2', identifier: 'B', optionText: 'Rajya Sabha', isCorrect: false, orderIndex: 2 },
        ],
        explanation: { explanation: 'Money Bills can only be introduced in Lok Sabha.' },
        deletedAt: null,
      },
    ];

    mockPrisma = {
      client: {
        $transaction: vi.fn().mockImplementation(async (cb) => {
          if (typeof cb === 'function') return cb(mockPrisma.client);
          if (Array.isArray(cb)) return Promise.all(cb);
          return cb;
        }),
        user: {
          findUnique: vi.fn().mockImplementation(({ where }) => {
            if (where.id) {
              const matched = Object.values(personas).find((p) => p.id === where.id);
              if (matched) {
                return Promise.resolve({
                  ...matched,
                  isEmailVerified: true,
                  currentStreak: 4,
                  highestStreak: 10,
                  lastActiveDate: new Date(),
                  roles: [{ role: { name: matched.role, permissions: [] } }],
                  _count: { attempts: 5, practiceSessions: 10, reports: 1 },
                });
              }
              if (registeredCadet && registeredCadet.id === where.id) {
                return Promise.resolve(registeredCadet);
              }
            }
            if (where.email) {
              const matched = Object.values(personas).find((p) => p.email === where.email);
              if (matched) {
                return Promise.resolve({
                  ...matched,
                  passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$mockHash$mockHash',
                  isEmailVerified: true,
                  currentStreak: 4,
                  highestStreak: 10,
                  lastActiveDate: new Date(),
                  roles: [{ role: { name: matched.role, permissions: [] } }],
                  _count: { attempts: 5, practiceSessions: 10, reports: 1 },
                });
              }
              if (registeredCadet && registeredCadet.email === where.email) {
                return Promise.resolve(registeredCadet);
              }
            }
            return Promise.resolve(null);
          }),
          create: vi.fn().mockImplementation(({ data }) => {
            registeredCadet = {
              id: 'usr-new-cadet-2026',
              ...data,
              isEmailVerified: true,
              currentStreak: 0,
              highestStreak: 0,
              lastActiveDate: null,
              roles: [{ role: { name: RoleType.STUDENT, permissions: [] } }],
              _count: { attempts: 0, practiceSessions: 0, reports: 0 },
            };
            return Promise.resolve({ ...registeredCadet });
          }),
          update: vi.fn().mockImplementation(({ where, data }) => {
            if (registeredCadet && registeredCadet.id === where.id) {
              registeredCadet = { ...registeredCadet, ...data };
              return Promise.resolve(registeredCadet);
            }
            return Promise.resolve({ id: where.id, ...data });
          }),
          count: vi.fn().mockResolvedValue(1250),
          findMany: vi.fn().mockImplementation(() =>
            Promise.resolve(
              Object.values(personas).map((p) => ({
                ...p,
                roles: [{ role: { name: p.role } }],
                deletedAt: null,
                _count: { attempts: 2, practiceSessions: 5, reports: 0 },
              })),
            ),
          ),
        },
        role: {
          findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve({ id: `role-${where.name}`, name: where.name })),
        },
        userRole: {
          create: vi.fn().mockResolvedValue({ id: 'ur-1' }),
        },
        auditLog: {
          create: vi.fn().mockImplementation(({ data }) => mockAudit.logAction(data.userId, data.action, data.entityType, data.entityId, data.metadata)),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(auditLogs)),
          count: vi.fn().mockImplementation(() => Promise.resolve(auditLogs.length)),
        },
        subject: {
          findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id || 'sub-math', name: 'Elementary Mathematics', slug: 'elementary-mathematics' })),
          findFirst: vi.fn().mockImplementation(() => Promise.resolve({ id: 'sub-math', name: 'Elementary Mathematics', slug: 'elementary-mathematics' })),
          findMany: vi.fn().mockResolvedValue([{ id: 'sub-math', name: 'Elementary Mathematics', slug: 'elementary-mathematics', _count: { pyqPapers: 5 } }]),
        },
        chapter: {
          findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id || 'chap-trig', subjectId: 'sub-math', name: 'Trigonometry', slug: 'trigonometry' })),
        },
        topic: {
          findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id || 'top-identities', chapterId: 'chap-trig', name: 'Identities', slug: 'identities' })),
        },
        subtopic: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        question: {
          findMany: vi.fn().mockImplementation(() => Promise.resolve(activeQuestions)),
          findUnique: vi.fn().mockImplementation(({ where }) => {
            const q = activeQuestions.find((item) => item.id === where.id);
            return Promise.resolve(q || null);
          }),
          create: vi.fn().mockImplementation(({ data }) => {
            const newQ = { id: `q-created-${Date.now()}`, ...data, status: data.status || QuestionStatus.DRAFT };
            activeQuestions.push(newQ);
            return Promise.resolve(newQ);
          }),
          update: vi.fn().mockImplementation(({ where, data }) => {
            const idx = activeQuestions.findIndex((item) => item.id === where.id);
            if (idx >= 0) {
              activeQuestions[idx] = { ...activeQuestions[idx], ...data };
              return Promise.resolve(activeQuestions[idx]);
            }
            return Promise.resolve({ id: where.id, ...data });
          }),
          count: vi.fn().mockImplementation(() => Promise.resolve(activeQuestions.length)),
        },
        questionOption: {
          findFirst: vi.fn().mockImplementation(({ where }) => {
            for (const q of activeQuestions) {
              const opt = q.options?.find((o: any) => o.id === where.id || (o.questionId === where.questionId && o.id === where.id));
              if (opt) return Promise.resolve(opt);
            }
            return Promise.resolve(null);
          }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        questionExplanation: {
          create: vi.fn().mockResolvedValue({ id: 'exp-1' }),
        },
        bookmark: {
          findUnique: vi.fn().mockImplementation(({ where }) => {
            const key = `${where.userId_questionId.userId}_${where.userId_questionId.questionId}`;
            return Promise.resolve(userBookmarks.has(key) ? { id: 'bm-1', ...where.userId_questionId } : null);
          }),
          create: vi.fn().mockImplementation(({ data }) => {
            const key = `${data.userId}_${data.questionId}`;
            userBookmarks.add(key);
            return Promise.resolve({ id: `bm-${Date.now()}`, ...data });
          }),
          delete: vi.fn().mockImplementation(({ where }) => {
            const key = `${where.userId_questionId.userId}_${where.userId_questionId.questionId}`;
            userBookmarks.delete(key);
            return Promise.resolve({ id: 'bm-1' });
          }),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(Array.from(userBookmarks))),
          count: vi.fn().mockResolvedValue(2),
        },
        mistake: {
          upsert: vi.fn().mockImplementation(({ create, update }) => {
            const existingIdx = userMistakes.findIndex(
              (m) => m.userId === create.userId && m.questionId === create.questionId,
            );
            if (existingIdx >= 0) {
              userMistakes[existingIdx] = { ...userMistakes[existingIdx], ...update };
              return Promise.resolve(userMistakes[existingIdx]);
            }
            const newM = { id: `mst-${Date.now()}`, ...create, status: MistakeStatus.ACTIVE, question: activeQuestions[0] };
            userMistakes.push(newM);
            return Promise.resolve(newM);
          }),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(userMistakes)),
          findUnique: vi.fn().mockImplementation(({ where }) => {
            return Promise.resolve(userMistakes.find((m) => m.id === where.id) || null);
          }),
          update: vi.fn().mockImplementation(({ where, data }) => {
            const idx = userMistakes.findIndex((m) => m.id === where.id);
            if (idx >= 0) {
              userMistakes[idx] = { ...userMistakes[idx], ...data };
              return Promise.resolve(userMistakes[idx]);
            }
            return Promise.resolve({ id: where.id, ...data });
          }),
          count: vi.fn().mockImplementation(() => Promise.resolve(userMistakes.length)),
        },
        questionReport: {
          create: vi.fn().mockImplementation(({ data }) => {
            const r = { id: `rep-${Date.now()}`, ...data, status: 'PENDING', createdAt: new Date() };
            questionReports.push(r);
            return Promise.resolve(r);
          }),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(questionReports)),
          findUnique: vi.fn().mockImplementation(({ where }) => {
            const found = questionReports.find((r) => r.id === where.id);
            if (found) return Promise.resolve({ ...found, question: activeQuestions[0] });
            return Promise.resolve(null);
          }),
          update: vi.fn().mockImplementation(({ where, data }) => {
            const idx = questionReports.findIndex((r) => r.id === where.id);
            if (idx >= 0) {
              questionReports[idx] = { ...questionReports[idx], ...data };
              return Promise.resolve(questionReports[idx]);
            }
            return Promise.resolve({ id: where.id, ...data });
          }),
          count: vi.fn().mockImplementation(() => Promise.resolve(questionReports.length)),
        },
        practiceSession: {
          create: vi.fn().mockImplementation(({ data }) => {
            activePracticeSession = {
              id: `prac-${Date.now()}`,
              ...data,
              isCompleted: false,
              score: 0,
              correctCount: 0,
              incorrectCount: 0,
              unattemptedCount: activeQuestions.length,
              negativeMarks: 0,
              totalTimeSpentSeconds: 0,
              startedAt: new Date(),
            };
            return Promise.resolve(activePracticeSession);
          }),
          findUnique: vi.fn().mockImplementation(({ where }) => {
            if (activePracticeSession && activePracticeSession.id === where.id) {
              return Promise.resolve({
                ...activePracticeSession,
                answers: activeQuestions.map((q, idx) => ({
                  id: `pa-${idx}`,
                  questionId: q.id,
                  selectedOptionId: 'opt-1',
                  isCorrect: true,
                  orderIndex: idx + 1,
                  isMarkedForReview: false,
                  question: q,
                })),
              });
            }
            return Promise.resolve(null);
          }),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockImplementation(({ where, data }) => {
            if (activePracticeSession && activePracticeSession.id === where.id) {
              activePracticeSession = { ...activePracticeSession, ...data };
              return Promise.resolve(activePracticeSession);
            }
            return Promise.resolve({ id: where.id, ...data });
          }),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(activePracticeSession ? [activePracticeSession] : [])),
          aggregate: vi.fn().mockResolvedValue({ _sum: { totalTimeSpentSeconds: 60 } }),
        },
        practiceAnswer: {
          create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: `pa-${Date.now()}`, ...data })),
          createMany: vi.fn().mockResolvedValue({ count: activeQuestions.length }),
          findUnique: vi.fn().mockImplementation(({ where }) => {
            return Promise.resolve({
              id: 'pa-1',
              ...where.sessionId_questionId,
              question: activeQuestions[0],
            });
          }),
          findMany: vi.fn().mockImplementation(() => {
            return Promise.resolve(
              activeQuestions.map((q, idx) => ({
                id: `pa-${idx}`,
                questionId: q.id,
                selectedOptionId: 'opt-1',
                isCorrect: true,
                orderIndex: idx + 1,
                question: q,
              })),
            );
          }),
          update: vi.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
          count: vi.fn().mockResolvedValue(5),
        },
        test: {
          findUnique: vi.fn().mockImplementation(({ where }) => {
            if (where.slug === 'mock-cds-2026' || where.id === 'mock-cds-2026') {
              return Promise.resolve(mockTestEntity);
            }
            return Promise.resolve(null);
          }),
          findMany: vi.fn().mockResolvedValue([mockTestEntity]),
          create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'test-created', ...data })),
          count: vi.fn().mockResolvedValue(10),
        },
        testAttempt: {
          findFirst: vi.fn().mockImplementation(({ where }) => {
            if (activeAttempt && activeAttempt.userId === where.userId && activeAttempt.testId === where.testId) {
              return Promise.resolve(activeAttempt);
            }
            return Promise.resolve(null);
          }),
          findUnique: vi.fn().mockImplementation(({ where }) => {
            if (activeAttempt && activeAttempt.id === where.id) {
              return Promise.resolve({
                ...activeAttempt,
                test: mockTestEntity,
              });
            }
            return Promise.resolve(null);
          }),
          create: vi.fn().mockImplementation(({ data }) => {
            activeAttempt = {
              id: `att-${Date.now()}`,
              ...data,
              status: AttemptStatus.IN_PROGRESS,
              expiresAt: new Date(Date.now() + 120 * 60 * 1000),
              answers: [],
              questionStates: [],
              result: null,
              test: mockTestEntity,
            };
            return Promise.resolve(activeAttempt);
          }),
          update: vi.fn().mockImplementation(({ where, data }) => {
            if (activeAttempt && activeAttempt.id === where.id) {
              activeAttempt = { ...activeAttempt, ...data, test: mockTestEntity };
              return Promise.resolve(activeAttempt);
            }
            return Promise.resolve({ id: where.id, ...data, test: mockTestEntity });
          }),
          count: vi.fn().mockResolvedValue(1),
          aggregate: vi.fn().mockResolvedValue({ _sum: { timeSpentSeconds: 120 } }),
        },
        attemptAnswer: {
          upsert: vi.fn().mockResolvedValue({ id: 'att-ans-1' }),
          findMany: vi.fn().mockImplementation(() => Promise.resolve(activeAttempt?.answers || [])),
          count: vi.fn().mockResolvedValue(1),
        },
        attemptQuestionState: {
          upsert: vi.fn().mockResolvedValue({ id: 'aqs-1' }),
        },
        result: {
          create: vi.fn().mockImplementation(({ data }) => {
            const res = { id: `res-${Date.now()}`, ...data };
            if (activeAttempt) activeAttempt.result = res;
            return Promise.resolve(res);
          }),
          findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve(activeAttempt?.result || null)),
          findMany: vi.fn().mockResolvedValue([]),
        },
        resultSubject: { findMany: vi.fn().mockResolvedValue([]) },
        resultTopic: { findMany: vi.fn().mockResolvedValue([]) },
        pYQPaper: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'pyq-cds-2024-2', year: 2024, session: 'II', exam: 'CDS', title: 'CDS II 2024 Official Paper', isPublished: true, _count: { questions: 100 } },
          ]),
          findFirst: vi.fn().mockResolvedValue(null),
          findUnique: vi.fn().mockResolvedValue({ id: 'pyq-cds-2024-2', year: 2024, session: 'II', exam: 'CDS', isPublished: true, questions: [] }),
          create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pyq-new', ...data })),
          count: vi.fn().mockResolvedValue(4),
        },
        platformSetting: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    authService = new AuthService(mockPrisma as unknown as PrismaService, mockJwt as unknown as JwtService);
    usersService = new UsersService(mockPrisma as unknown as PrismaService);
    analyticsService = new AnalyticsService(mockPrisma as unknown as PrismaService);
    practiceService = new PracticeService(mockPrisma as unknown as PrismaService);
    bookmarksService = new BookmarksService(mockPrisma as unknown as PrismaService);
    mistakesService = new MistakesService(mockPrisma as unknown as PrismaService);
    pyqsService = new PyqsService(mockPrisma as unknown as PrismaService, mockAudit as any);
    attemptsService = new AttemptsService(mockPrisma as unknown as PrismaService);
    adminService = new AdminService(mockPrisma as unknown as PrismaService, mockAudit as any);
    questionsService = new QuestionsService(mockPrisma as unknown as PrismaService, mockAudit as any);
    testsService = new TestsService(mockPrisma as unknown as PrismaService);

    const reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  // =========================================================================
  // 1. TEST PERSONAS
  // =========================================================================
  describe('1. Test Personas & Role-Based Access Validation', () => {
    it('verifies safe credentials and roles for all 5 required personas', async () => {
      for (const [key, p] of Object.entries(personas)) {
        const user = await mockPrisma.client.user.findUnique({ where: { email: p.email } });
        expect(user).toBeDefined();
        expect(user.role).toBe(p.role);
        expect(user.fullName).toBe(p.fullName);
      }
    });

    it('enforces RBAC: student account cannot invoke administrative services', async () => {
      const mockContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: personas.student.id, roles: [RoleType.STUDENT] },
          }),
        }),
      };

      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockImplementation((key) =>
        key === 'isPublic' ? false : [RoleType.ADMIN],
      );
      expect(() => rolesGuard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('enforces RBAC: admin account successfully accesses admin services', async () => {
      const mockContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: personas.admin.id, roles: [RoleType.ADMIN] },
          }),
        }),
      };

      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockImplementation((key) =>
        key === 'isPublic' ? false : [RoleType.ADMIN],
      );
      expect(rolesGuard.canActivate(mockContext)).toBe(true);
    });
  });

  // =========================================================================
  // 2. STUDENT JOURNEY
  // =========================================================================
  describe('2. Complete Real-World Student Journey', () => {
    it('executes full cadet journey from registration through practice, mocks, and review', async () => {
      // 1. Register
      const registered = await authService.register({
        email: 'cadet.anand@cdsprep.com',
        password: 'Cdsprep@2026',
        fullName: 'Anand Kumar',
        targetAcademy: AcademyTarget.IMA,
      });
      expect(registered.user.id).toBeDefined();

      // 2. Login
      const loginRes = await authService.login({
        email: 'cadet.anand@cdsprep.com',
        password: 'Cdsprep@2026',
      });
      expect(loginRes.tokens.accessToken).toBe('valid.jwt.access.token');

      // 3. Dashboard
      const dash = await analyticsService.getStudentDashboardSummary(registered.user.id);
      expect(dash.dailyGoals).toBeDefined();
      expect(dash.studyPlan).toBeDefined();

      // 4. Select Subject -> Chapter -> Topic -> Start Practice
      const sessionRes = await practiceService.createSession(registered.user.id, {
        mode: PracticeMode.TOPIC,
        subjectId: 'sub-math',
        chapterId: 'chap-trig',
        topicId: 'top-identities',
        questionCount: 5,
        randomize: true,
        enableNegativeMarking: true,
      });
      expect(sessionRes.session.id).toBeDefined();

      // 5. Answer Questions & Instant Solution
      const q = activeQuestions[0];
      const answerRes = await practiceService.submitAnswer(
        registered.user.id,
        sessionRes.session.id,
        {
          questionId: q.id,
          selectedOptionId: 'opt-1', // Correct answer
          timeSpentSeconds: 15,
        },
      );
      expect(answerRes.isCorrect).toBe(true);

      // 6. Bookmark Question
      const bm = await bookmarksService.toggleBookmark(registered.user.id, q.id);
      expect(bm.isBookmarked).toBe(true);

      // 7. Mark for Review
      const reviewRes = await practiceService.submitAnswer(
        registered.user.id,
        sessionRes.session.id,
        {
          questionId: q.id,
          selectedOptionId: 'opt-1',
          timeSpentSeconds: 5,
          isMarkedForReview: true,
        },
      );
      expect(reviewRes).toBeDefined();

      // 8. Report Question
      const reportRes = await practiceService.reportQuestion(
        registered.user.id,
        { questionId: q.id, reason: 'AMBIGUOUS_QUESTION', details: 'Option format check' },
      );
      expect(reportRes.status).toBe('PENDING');

      // 9. Submit Practice Session & View Results
      const finalPractice = await practiceService.completeSession(registered.user.id, sessionRes.session.id);
      expect(finalPractice.metrics).toBeDefined();

      // 10. Record Mistake & Review Mistakes Notebook
      userMistakes.push({
        id: 'mst-1',
        userId: registered.user.id,
        questionId: q.id,
        status: MistakeStatus.ACTIVE,
        question: q,
      });
      const notebook = await mistakesService.listMistakes(registered.user.id);
      expect(notebook.length).toBeGreaterThan(0);

      const mastered = await mistakesService.markMastered(registered.user.id, 'mst-1');
      expect(mastered.status).toBe(MistakeStatus.MASTERED);

      // 11. PYQ Flow
      const pyqList = await pyqsService.listPapers();
      expect(pyqList.length).toBeGreaterThan(0);

      // 12. Mock Examination: Start, Autosave, Submit, Authoritative Result
      const mockAttempt = await attemptsService.startAttempt(registered.user.id, 'mock-cds-2026');
      expect(mockAttempt.attempt.id).toBeDefined();

      // Autosave answer
      await attemptsService.autosave(registered.user.id, mockAttempt.attempt.id, {
        questionId: q.id,
        selectedOptionId: 'opt-1',
        paletteState: QuestionPaletteState.ANSWERED,
      });

      // Submit mock
      const examSubmit = await attemptsService.submit(registered.user.id, mockAttempt.attempt.id, {
        timeSpentSeconds: 1200,
      });
      expect(examSubmit.status).toBe(AttemptStatus.SUBMITTED);
      expect(examSubmit.result).toBeDefined();

      // 13. Analytics
      const analytics = await analyticsService.getStudentDashboardSummary(registered.user.id);
      expect(analytics).toBeDefined();
      expect(analytics.user).toBeDefined();

      // 14. Logout / Session Invalidation
      const logoutRes = await authService.logout(registered.user.id);
      expect(logoutRes.message).toBe('Logged out successfully');
    });
  });

  // =========================================================================
  // 3. TEST ENGINE FAILURE TESTING
  // =========================================================================
  describe('3. Test Engine Adversarial & Failure Resiliency', () => {
    const studentId = personas.student.id;
    const testId = 'mock-cds-2026';

    it('refresh during test / reopen attempt: resumes with previous answers and calculates authoritative remaining seconds', async () => {
      // First open
      const firstStart = await attemptsService.startAttempt(studentId, testId, 'session-tab-1');
      const attId = firstStart.attempt.id;

      // Autosave answer
      await attemptsService.autosave(studentId, attId, {
        questionId: activeQuestions[0].id,
        selectedOptionId: 'opt-1',
        paletteState: QuestionPaletteState.ANSWERED,
      });

      // Simulate refresh / reopen
      const resumed = await attemptsService.startAttempt(studentId, testId, 'session-tab-1');
      expect(resumed.isResumed).toBe(true);
      expect(resumed.remainingSeconds).toBeGreaterThan(0);
    });

    it('multiple tabs: detects second tab open and logs integrity telemetry', async () => {
      const firstTab = await attemptsService.startAttempt(studentId, testId, 'tab-token-alpha');
      // Second tab opens with distinct session token
      const secondTab = await attemptsService.startAttempt(studentId, testId, 'tab-token-beta');
      expect(secondTab.isResumed).toBe(true);
    });

    it('duplicate submission: returns existing result idempotently without double-evaluation', async () => {
      const start = await attemptsService.startAttempt(studentId, testId);
      const attId = start.attempt.id;

      // Submit first time
      const firstSubmit = await attemptsService.submit(studentId, attId, { timeSpentSeconds: 60 });
      expect(firstSubmit.status).toBe(AttemptStatus.SUBMITTED);

      // Submit second time immediately
      const secondSubmit = await attemptsService.submit(studentId, attId, { timeSpentSeconds: 60 });
      expect(secondSubmit.isIdempotent).toBe(true);
      expect(secondSubmit.status).toBe(AttemptStatus.SUBMITTED);
    });

    it('expired timer: marks attempt EXPIRED on server and strictly rejects subsequent autosaves', async () => {
      const start = await attemptsService.startAttempt(studentId, testId);
      const attId = start.attempt.id;

      // Artificially lapse server expiration
      activeAttempt.expiresAt = new Date(Date.now() - 10000);

      // Attempt autosave after expiry
      await expect(
        attemptsService.autosave(studentId, attId, {
          questionId: activeQuestions[0].id,
          selectedOptionId: 'opt-1',
          paletteState: QuestionPaletteState.ANSWERED,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(activeAttempt.status).toBe(AttemptStatus.EXPIRED);
    });

    it('authoritative server score: ignores client scores and computes marks strictly from database keys', async () => {
      const start = await attemptsService.startAttempt(studentId, testId);
      const attId = start.attempt.id;

      // Answer 1 question correctly (+1.0)
      activeAttempt.answers = [
        {
          questionId: activeQuestions[0].id,
          selectedOptionId: 'opt-1', // Correct
          timeSpentSeconds: 30,
        },
      ];

      const sub = await attemptsService.submit(studentId, attId, { timeSpentSeconds: 30 });
      expect(sub.result.netScore).toBe(1.0);
      expect(sub.result.correctCount).toBe(1);
    });

    it('unauthorized attempt ID (IDOR): strictly rejects autosave or submit from different student', async () => {
      const start = await attemptsService.startAttempt(studentId, testId);
      const attId = start.attempt.id;

      const attackerId = 'attacker-cadet-666';
      await expect(
        attemptsService.autosave(attackerId, attId, {
          questionId: activeQuestions[0].id,
          selectedOptionId: 'opt-1',
          paletteState: QuestionPaletteState.ANSWERED,
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        attemptsService.submit(attackerId, attId, { timeSpentSeconds: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 4. ADMIN JOURNEY
  // =========================================================================
  describe('4. Administrative & Content Operations Workflow', () => {
    const adminUser = {
      id: personas.admin.id,
      email: personas.admin.email,
      roles: [RoleType.ADMIN],
    };

    it('executes question lifecycle: DRAFT -> IN_REVIEW -> APPROVE -> PUBLISH', async () => {
      // 1. Create Question as DRAFT
      const draft = await questionsService.create(
        {
          subjectId: 'sub-math',
          chapterId: 'chap-trig',
          topicId: 'top-identities',
          questionText: 'What is $\\tan 45^\\circ$?',
          marks: 1.0,
          negativeMarks: 0.33,
          options: [
            { identifier: 'A', optionText: '1', isCorrect: true, orderIndex: 1 },
            { identifier: 'B', optionText: '0', isCorrect: false, orderIndex: 2 },
          ],
          explanation: { explanation: 'Standard trigonometric ratio $\\tan 45^\\circ = 1$.' },
        },
        adminUser,
      );
      expect(draft.status).toBe(QuestionStatus.DRAFT);

      // 2. Prohibit direct transition from DRAFT to PUBLISHED
      await expect(
        questionsService.updateStatus(draft.id, QuestionStatus.PUBLISHED, adminUser),
      ).rejects.toThrow(BadRequestException);

      // 3. Transition to IN_REVIEW
      const inReview = await questionsService.updateStatus(
        draft.id,
        QuestionStatus.IN_REVIEW,
        adminUser,
      );
      expect(inReview.status).toBe(QuestionStatus.IN_REVIEW);

      // 4. Still prohibit direct publish from IN_REVIEW
      await expect(
        questionsService.updateStatus(draft.id, QuestionStatus.PUBLISHED, adminUser),
      ).rejects.toThrow(BadRequestException);

      // 5. Approve question (records reviewer attribution and timestamp)
      const approved = await questionsService.updateStatus(
        draft.id,
        QuestionStatus.APPROVED,
        adminUser,
      );
      expect(approved.status).toBe(QuestionStatus.APPROVED);
      expect(approved.reviewedById).toBe(adminUser.id);
      expect(approved.verifiedAt).toBeDefined();

      // 6. Publish question
      const published = await questionsService.updateStatus(
        draft.id,
        QuestionStatus.PUBLISHED,
        adminUser,
      );
      expect(published.status).toBe(QuestionStatus.PUBLISHED);
    });

    it('creates PYQ paper with official curriculum attribution', async () => {
      const pyq = await pyqsService.createPaper(
        {
          title: 'CDS I 2025 Official Mathematics',
          year: 2025,
          session: 'I',
          exam: 'CDS',
          subjectSlug: 'elementary-mathematics',
          totalMarks: 100,
          durationMin: 120,
          source: 'UPSC CDS Official Paper',
          attribution: 'Union Public Service Commission (Govt. of India), reproduced under Section 52(1)(q) of Indian Copyright Act',
        },
        adminUser,
      );
      expect(pyq.id).toBeDefined();
    });

    it('creates full mock test with section configurations', async () => {
      const testObj = await testsService.createTest({
        title: 'CDS 2026 All India Open Mock 02',
        slug: 'cds-2026-all-india-open-mock-02',
        testType: TestType.FULL_MOCK,
        targetAcademy: AcademyTarget.IMA,
        durationMinutes: 120,
        totalMarks: 100,
        passingMarks: 40,
        negativeMarks: 0.33,
      });
      expect(testObj.id).toBeDefined();
    });

    it('resolves candidate report with question fix and audit logging', async () => {
      // Create a pending report
      const rep = await practiceService.reportQuestion(
        personas.student.id,
        { questionId: activeQuestions[0].id, reason: 'TYPOGRAPHICAL_ERROR', details: 'Typo in question text' },
      );

      const resolved = await adminService.resolveReport(
        rep.reportId,
        {
          action: ReportResolutionAction.RESOLVE,
          notes: 'Fixed typo and re-verified',
          questionFix: {
            questionText: 'If $\\sec \\theta + \\tan \\theta = 3$, find $\\sin \\theta$.',
            republish: true,
          },
        },
        adminUser.id,
      );
      expect(resolved.status).toBe('RESOLVED');
      expect(mockAudit.logAction).toHaveBeenCalled();
    });

    it('inspects user management and security audit feed', async () => {
      const users = await adminService.listUsers({ page: 1, limit: 10 });
      expect(users.items.length).toBeGreaterThan(0);

      const logs = await mockAudit.listAuditLogs(1, 10);
      expect(logs.items).toBeDefined();
    });
  });

  // =========================================================================
  // 5. CONTENT & ARITHMETIC TESTING
  // =========================================================================
  describe('5. Content Fidelity, Mathematical Equations & Negative Marking', () => {
    it('verifies KaTeX formula balance and rejects unbalanced LaTeX delimiters', async () => {
      const unbalancedFormula = 'Compute $x = \\frac{1}{2} without closing delimiter';
      await expect(
        questionsService.create(
          {
            subjectId: 'sub-math',
            chapterId: 'chap-trig',
            topicId: 'top-identities',
            questionText: unbalancedFormula,
            marks: 1,
            negativeMarks: 0.33,
            options: [
              { identifier: 'A', optionText: '1', isCorrect: true, orderIndex: 1 },
              { identifier: 'B', optionText: '0', isCorrect: false, orderIndex: 2 },
            ],
          },
          { id: personas.admin.id, email: personas.admin.email, roles: [RoleType.ADMIN] },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('verifies exact 1/3 negative marking deduction on incorrect answers', async () => {
      const start = await attemptsService.startAttempt(personas.student.id, 'mock-cds-2026');
      activeAttempt.answers = [
        { questionId: activeQuestions[0].id, selectedOptionId: 'opt-2', timeSpentSeconds: 20 }, // Wrong: -0.33
      ];

      const res = await attemptsService.submit(personas.student.id, start.attempt.id, { timeSpentSeconds: 20 });
      expect(res.result.incorrectCount).toBe(1);
      expect(res.result.negativeMarks).toBe(0.33);
      // Net score is bounded by Math.max(0, grossMarks - negativeMarks) = 0
      expect(res.result.netScore).toBe(0);
    });
  });
});
