import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PyqsService } from '../src/pyqs/pyqs.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { AttemptsService } from '../src/attempts/attempts.service';
import { RoleType } from '@cdsprep/types';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Phase 6 — PYQ System & Test Engine Integration Suite', () => {
  let pyqsService: PyqsService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockAttemptsService: any;

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@cdsprep.com',
    roles: [RoleType.ADMIN],
  };

  const mockStudentUser: AuthenticatedUser = {
    id: 'user-student-1',
    email: 'student@cdsprep.com',
    roles: [RoleType.STUDENT],
  };

  const mockSubject = {
    id: 'sub-maths-1',
    name: 'Elementary Mathematics',
    slug: 'elementary-maths',
    chapters: [
      {
        id: 'chap-1',
        topics: [{ id: 'top-1' }],
      },
    ],
  };

  const mockPaperRecord = {
    id: 'paper-pyq-2023-1',
    year: 2023,
    session: 'I',
    exam: 'CDS',
    subjectSlug: 'elementary-maths',
    subjectId: 'sub-maths-1',
    title: 'CDS I 2023 — Elementary Mathematics Official Paper',
    totalMarks: 100.0,
    durationMin: 120,
    isPublished: true,
    source: 'UPSC Official Archive',
    sourceUrl: 'https://upsc.gov.in',
    licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    attribution: 'Official Question Paper published by Union Public Service Commission (UPSC)',
    testId: 'test-backing-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    subject: mockSubject,
    _count: { questions: 2 },
    questions: [
      {
        id: 'pq-1',
        questionNumber: 1,
        questionId: 'q-1',
        question: {
          id: 'q-1',
          questionText: 'What is $2^3 + 3^2$?',
          marks: 1.0,
          negativeMarks: 0.33,
          options: [
            { id: 'opt-1', identifier: 'A', optionText: '$17$', isCorrect: true },
            { id: 'opt-2', identifier: 'B', optionText: '$15$', isCorrect: false },
          ],
          explanation: { explanation: '$8 + 9 = 17$' },
          tagMaps: [],
        },
      },
      {
        id: 'pq-2',
        questionNumber: 2,
        questionId: 'q-2',
        question: {
          id: 'q-2',
          questionText: 'Value of $\\tan(45^\\circ)$?',
          marks: 1.0,
          negativeMarks: 0.33,
          options: [
            { id: 'opt-3', identifier: 'A', optionText: '$1$', isCorrect: true },
            { id: 'opt-4', identifier: 'B', optionText: '$0$', isCorrect: false },
          ],
          explanation: { explanation: 'Standard trigonometric value' },
          tagMaps: [],
        },
      },
    ],
  };

  beforeEach(() => {
    mockAudit = {
      logAction: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    mockAttemptsService = {
      startAttempt: vi.fn().mockResolvedValue({
        attempt: {
          id: 'attempt-session-pyq-1',
          userId: 'user-student-1',
          testId: 'test-backing-1',
          status: 'IN_PROGRESS',
        },
        test: { id: 'test-backing-1', title: 'CDS I 2023' },
      }),
    };

    mockPrisma = {
      client: {
        pYQPaper: {
          findMany: vi.fn().mockResolvedValue([mockPaperRecord]),
          findUnique: vi.fn().mockResolvedValue(mockPaperRecord),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        pYQQuestion: {
          create: vi.fn(),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        subject: {
          findFirst: vi.fn().mockResolvedValue(mockSubject),
          findMany: vi.fn().mockResolvedValue([mockSubject]),
        },
        question: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'q-1', options: [{ isCorrect: true }] },
            { id: 'q-2', options: [{ isCorrect: true }] },
          ]),
          create: vi.fn().mockResolvedValue({ id: 'q-new-1' }),
        },
        test: {
          findUnique: vi.fn(),
          create: vi.fn().mockResolvedValue({ id: 'test-backing-1' }),
          update: vi.fn().mockResolvedValue({ id: 'test-backing-1' }),
        },
        testSection: {
          findFirst: vi.fn().mockResolvedValue({ id: 'sec-1' }),
          create: vi.fn(),
        },
        testQuestion: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => {
          if (typeof cb === 'function') {
            return cb(mockPrisma.client);
          }
          return Promise.all(cb);
        }),
      },
    };

    pyqsService = new PyqsService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
      mockAttemptsService as unknown as AttemptsService,
    );
  });

  describe('1. Discovery & Catalog', () => {
    it('discovers published PYQ papers with filters for year and subject', async () => {
      const papers = await pyqsService.listPapers({
        year: 2023,
        subjectSlug: 'elementary-maths',
      });

      expect(papers).toHaveLength(1);
      expect(papers[0].title).toContain('CDS I 2023');
      expect(papers[0].totalMarks).toBe(100.0);
    });

    it('returns distinct years catalog with paper counts and sessions', async () => {
      mockPrisma.client.pYQPaper.findMany.mockResolvedValueOnce([
        { year: 2023, session: 'I', subjectSlug: 'elementary-maths', exam: 'CDS' },
        { year: 2023, session: 'II', subjectSlug: 'elementary-maths', exam: 'CDS' },
        { year: 2022, session: 'I', subjectSlug: 'gk', exam: 'CDS' },
      ]);

      const catalog = await pyqsService.getYearsCatalog();
      expect(catalog).toHaveLength(2);
      expect(catalog[0].year).toBe(2023);
      expect(catalog[0].paperCount).toBe(2);
      expect(catalog[0].sessions).toContain('I');
      expect(catalog[0].sessions).toContain('II');
    });

    it('returns subjects catalog with PYQ metrics', async () => {
      mockPrisma.client.subject.findMany.mockResolvedValueOnce([
        {
          id: 'sub-1',
          name: 'English',
          slug: 'english',
          _count: { pyqPapers: 12 },
        },
      ]);

      const subjects = await pyqsService.getSubjectsCatalog();
      expect(subjects[0].slug).toBe('english');
      expect(subjects[0].pyqCount).toBe(12);
    });

    it('loads full paper details with options, explanations, and legal attribution', async () => {
      const paper = await pyqsService.getPaperDetails('paper-pyq-2023-1');
      expect(paper.id).toBe('paper-pyq-2023-1');
      expect(paper.questions).toHaveLength(2);
      expect(paper.questions[0].question.options).toHaveLength(2);
      expect(paper.licenseType).toBe('PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS');
      expect(paper.attribution).toContain('UPSC');
    });
  });

  describe('2. Test Engine Integration & Authoritative Execution', () => {
    it('starts an authoritative exam attempt through the test engine with zero duplicate scoring', async () => {
      const attemptSession = await pyqsService.startPaperAttempt(
        'paper-pyq-2023-1',
        mockStudentUser.id,
      );

      // Verifies that AttemptsService.startAttempt was called with user ID and backing testId
      expect(mockAttemptsService.startAttempt).toHaveBeenCalledWith(
        mockStudentUser.id,
        'test-backing-1',
      );
      expect(attemptSession.attempt.status).toBe('IN_PROGRESS');
    });

    it('rejects attempt start if paper is not published', async () => {
      mockPrisma.client.pYQPaper.findUnique.mockResolvedValueOnce({
        id: 'draft-paper-1',
        isPublished: false,
      });

      await expect(
        pyqsService.startPaperAttempt('draft-paper-1', mockStudentUser.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Legal Attribution & Licensing Compliance', () => {
    it('enforces source and attribution metadata on paper creation', async () => {
      await expect(
        pyqsService.createPaper(
          {
            year: 2024,
            session: 'I',
            exam: 'CDS',
            subjectSlug: 'elementary-maths',
            title: 'Unattributed Paper',
            source: '', // Missing
            attribution: '', // Missing
          },
          mockAdminUser,
        ),
      ).rejects.toThrow('Legal compliance error');
    });

    it('creates paper with verified licensing and records audit log', async () => {
      mockPrisma.client.pYQPaper.findFirst.mockResolvedValueOnce(null);
      mockPrisma.client.pYQPaper.create.mockResolvedValueOnce({
        id: 'paper-created-1',
        year: 2024,
        session: 'I',
        exam: 'CDS',
        title: 'CDS I 2024 Official Paper',
        licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
        attribution: 'Official Paper of UPSC',
      });

      const res = await pyqsService.createPaper(
        {
          year: 2024,
          session: 'I',
          exam: 'CDS',
          subjectSlug: 'elementary-maths',
          title: 'CDS I 2024 Official Paper',
          source: 'UPSC Official Press',
          attribution: 'Official Paper of UPSC',
        },
        mockAdminUser,
      );

      expect(res.id).toBe('paper-created-1');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        mockAdminUser.id,
        'pyq:create_paper',
        'PYQ_PAPER',
        'paper-created-1',
        expect.any(Object),
      );
    });
  });

  describe('4. Strict Validations & Quality Controls', () => {
    it('prevents duplicate paper creation for same Year, Session, Exam, and Subject', async () => {
      mockPrisma.client.pYQPaper.findFirst.mockResolvedValueOnce({
        id: 'existing-paper-dup',
      });

      await expect(
        pyqsService.createPaper(
          {
            year: 2023,
            session: 'I',
            exam: 'CDS',
            subjectSlug: 'elementary-maths',
            title: 'Conflicting Paper',
            source: 'UPSC',
            attribution: 'Official',
          },
          mockAdminUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects question mapping with duplicate question numbers', async () => {
      await expect(
        pyqsService.mapQuestions(
          'paper-pyq-2023-1',
          {
            questions: [
              { questionId: 'q-1', questionNumber: 1 },
              { questionId: 'q-2', questionNumber: 1 }, // Duplicate number
            ],
          },
          mockAdminUser,
        ),
      ).rejects.toThrow('Duplicate questionNumber detected');
    });

    it('rejects mapping the same question ID twice to the same paper', async () => {
      await expect(
        pyqsService.mapQuestions(
          'paper-pyq-2023-1',
          {
            questions: [
              { questionId: 'q-1', questionNumber: 1 },
              { questionId: 'q-1', questionNumber: 2 }, // Duplicate questionId
            ],
          },
          mockAdminUser,
        ),
      ).rejects.toThrow('Duplicate questionId mapping detected');
    });

    it('rejects mapping a question that has no correct answer designated', async () => {
      mockPrisma.client.question.findMany.mockResolvedValueOnce([
        {
          id: 'q-broken-1',
          questionType: 'MCQ_SINGLE',
          options: [
            { id: 'o-1', isCorrect: false },
            { id: 'o-2', isCorrect: false },
          ], // No correct option!
        },
      ]);

      await expect(
        pyqsService.mapQuestions(
          'paper-pyq-2023-1',
          {
            questions: [{ questionId: 'q-broken-1', questionNumber: 1 }],
          },
          mockAdminUser,
        ),
      ).rejects.toThrow('has no correct answer designated');
    });

    it('prevents publishing a paper with 0 mapped questions', async () => {
      mockPrisma.client.pYQPaper.findUnique.mockResolvedValueOnce({
        id: 'empty-paper',
        _count: { questions: 0 },
      });

      await expect(
        pyqsService.publishPaper('empty-paper', mockAdminUser),
      ).rejects.toThrow('Cannot publish a PYQ paper with 0 mapped questions');
    });
  });

  describe('5. Bulk Import with Legal Compliance', () => {
    it('executes atomic bulk import of paper + questions and records audit log', async () => {
      mockPrisma.client.pYQPaper.findFirst.mockResolvedValueOnce(null); // No duplicate
      mockPrisma.client.pYQPaper.create.mockResolvedValueOnce({
        id: 'imported-paper-10',
        year: 2021,
        session: 'II',
        exam: 'CDS',
        title: 'CDS II 2021 Bulk Imported',
        licenseType: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
      });

      const res = await pyqsService.bulkImportPYQ(
        {
          paper: {
            year: 2021,
            session: 'II',
            exam: 'CDS',
            subjectSlug: 'elementary-maths',
            title: 'CDS II 2021 Bulk Imported',
            source: 'UPSC Archives',
            attribution: 'Official UPSC Question Paper',
          },
          questions: [
            {
              questionNumber: 1,
              questionText: 'What is $10^2$?',
              options: [
                { identifier: 'A', optionText: '100', isCorrect: true },
                { identifier: 'B', optionText: '10', isCorrect: false },
              ],
            },
          ],
        },
        mockAdminUser,
      );

      expect(res).toBeDefined();
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        mockAdminUser.id,
        'pyq:bulk_import',
        'PYQ_PAPER',
        'imported-paper-10',
        expect.any(Object),
      );
    });
  });
});
