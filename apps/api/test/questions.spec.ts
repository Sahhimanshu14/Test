import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestionsService } from '../src/questions/questions.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { DifficultyLevel, QuestionStatus, QuestionType, RoleType } from '@cdsprep/types';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Phase 5 — Question Bank Content System Suite', () => {
  let questionsService: QuestionsService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockUserEditor: AuthenticatedUser = {
    id: 'user-editor-1',
    email: 'editor@cdsprep.com',
    roles: [RoleType.CONTENT_EDITOR],
  };

  const mockUserManager: AuthenticatedUser = {
    id: 'user-manager-1',
    email: 'manager@cdsprep.com',
    roles: [RoleType.CONTENT_MANAGER],
  };

  const mockUserAdmin: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@cdsprep.com',
    roles: [RoleType.ADMIN],
  };

  const mockSubject = {
    id: 'sub-maths',
    name: 'Elementary Mathematics',
    slug: 'elementary-maths',
  };

  const mockChapter = {
    id: 'chap-trig',
    subjectId: 'sub-maths',
    name: 'Trigonometry',
    slug: 'trigonometry',
  };

  const mockTopic = {
    id: 'top-identities',
    chapterId: 'chap-trig',
    name: 'Trigonometric Identities',
    slug: 'trigonometric-identities',
  };

  beforeEach(() => {
    mockAudit = {
      logAction: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
    };

    mockPrisma = {
      client: {
        subject: {
          findUnique: vi.fn().mockResolvedValue(mockSubject),
          findMany: vi.fn().mockResolvedValue([mockSubject]),
        },
        chapter: {
          findUnique: vi.fn().mockResolvedValue(mockChapter),
          findMany: vi.fn().mockResolvedValue([mockChapter]),
        },
        topic: {
          findUnique: vi.fn().mockResolvedValue(mockTopic),
          findMany: vi.fn().mockResolvedValue([mockTopic]),
        },
        subtopic: {
          findUnique: vi.fn().mockResolvedValue({ id: 'subtop-1', topicId: 'top-identities', name: 'Identities' }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        question: {
          count: vi.fn().mockResolvedValue(1),
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        questionOption: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        questionExplanation: {
          upsert: vi.fn().mockResolvedValue({ id: 'exp-1' }),
        },
        questionTag: {
          upsert: vi.fn().mockResolvedValue({ id: 'tag-1', name: 'geometry' }),
        },
        questionTagMap: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          create: vi.fn().mockResolvedValue({}),
          upsert: vi.fn().mockResolvedValue({}),
        },
        $transaction: vi.fn().mockImplementation(async (callback) => {
          if (typeof callback === 'function') {
            return callback(mockPrisma.client);
          }
          return Promise.all(callback);
        }),
      },
    };

    questionsService = new QuestionsService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
    );
  });

  describe('1. Hierarchy & Relational Validation', () => {
    it('validates correct Subject -> Chapter -> Topic hierarchy', async () => {
      const res = await questionsService.validateHierarchy('sub-maths', 'chap-trig', 'top-identities');
      expect(res.subject.id).toBe('sub-maths');
      expect(res.chapter.id).toBe('chap-trig');
      expect(res.topic.id).toBe('top-identities');
    });

    it('rejects if Chapter does not belong to Subject', async () => {
      mockPrisma.client.chapter.findUnique.mockResolvedValueOnce({
        id: 'chap-trig',
        subjectId: 'other-subject-id',
        name: 'Trigonometry',
      });

      await expect(
        questionsService.validateHierarchy('sub-maths', 'chap-trig', 'top-identities'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if Topic does not belong to Chapter', async () => {
      mockPrisma.client.topic.findUnique.mockResolvedValueOnce({
        id: 'top-identities',
        chapterId: 'other-chapter-id',
        name: 'Trigonometric Identities',
      });

      await expect(
        questionsService.validateHierarchy('sub-maths', 'chap-trig', 'top-identities'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if Subtopic does not belong to Topic', async () => {
      mockPrisma.client.subtopic.findUnique.mockResolvedValueOnce({
        id: 'subtop-1',
        topicId: 'other-topic-id',
        name: 'Unrelated Subtopic',
      });

      await expect(
        questionsService.validateHierarchy('sub-maths', 'chap-trig', 'top-identities', 'subtop-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. CRUD Across Question Types', () => {
    it('creates an MCQ question with KaTeX formula and creates audit log', async () => {
      const createdQuestion = {
        id: 'q-math-1',
        subjectId: 'sub-maths',
        chapterId: 'chap-trig',
        topicId: 'top-identities',
        questionText: 'What is $\\sin^2 \\theta + \\cos^2 \\theta$?',
        marks: 1.0,
        negativeMarks: 0.33,
        questionType: QuestionType.MCQ_SINGLE,
        difficulty: DifficultyLevel.EASY,
        status: QuestionStatus.DRAFT,
        source: 'CDS 2023 I',
        year: 2023,
        exam: 'CDS I',
        language: 'en',
        options: [
          { id: 'opt-1', identifier: 'A', optionText: '$1$', isCorrect: true, orderIndex: 0 },
          { id: 'opt-2', identifier: 'B', optionText: '$0$', isCorrect: false, orderIndex: 1 },
        ],
        explanation: {
          explanation: 'Fundamental identity of trigonometry: $\\sin^2 \\theta + \\cos^2 \\theta = 1$',
        },
      };

      mockPrisma.client.question.create.mockResolvedValue(createdQuestion);
      mockPrisma.client.question.findUnique.mockResolvedValue(createdQuestion);

      const result = await questionsService.create(
        {
          questionText: 'What is $\\sin^2 \\theta + \\cos^2 \\theta$?',
          subjectId: 'sub-maths',
          chapterId: 'chap-trig',
          topicId: 'top-identities',
          questionType: QuestionType.MCQ_SINGLE,
          marks: 1.0,
          negativeMarks: 0.33,
          options: [
            { identifier: 'A', optionText: '$1$', isCorrect: true },
            { identifier: 'B', optionText: '$0$', isCorrect: false },
          ],
          explanation: {
            explanation: 'Fundamental identity of trigonometry: $\\sin^2 \\theta + \\cos^2 \\theta = 1$',
          },
          tags: ['trigonometry'],
        },
        mockUserEditor,
      );

      expect(result.id).toBe('q-math-1');
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        'user-editor-1',
        'question:create',
        'QUESTION',
        'q-math-1',
        expect.any(Object),
      );
    });

    it('creates an Assertion/Reason question', async () => {
      const assertionQuestion = {
        id: 'q-gk-ar-1',
        subjectId: 'sub-maths',
        chapterId: 'chap-trig',
        topicId: 'top-identities',
        questionType: QuestionType.ASSERTION_REASON,
        questionText: 'Assertion (A): Sound travels faster in solids than gases. Reason (R): Solids have higher elasticity.',
        marks: 1.0,
        negativeMarks: 0.33,
        options: [
          { identifier: 'A', optionText: 'Both A and R are true and R is the correct explanation of A', isCorrect: true },
          { identifier: 'B', optionText: 'Both A and R are true but R is not the correct explanation of A', isCorrect: false },
        ],
      };

      mockPrisma.client.question.create.mockResolvedValue(assertionQuestion);
      mockPrisma.client.question.findUnique.mockResolvedValue(assertionQuestion);

      const result = await questionsService.create(
        {
          questionText: assertionQuestion.questionText,
          subjectId: 'sub-maths',
          chapterId: 'chap-trig',
          topicId: 'top-identities',
          questionType: QuestionType.ASSERTION_REASON,
          options: assertionQuestion.options,
        },
        mockUserEditor,
      );

      expect(result.questionType).toBe(QuestionType.ASSERTION_REASON);
    });

    it('creates a Numerical question with correct numeric value in metadata', async () => {
      const numQuestion = {
        id: 'q-num-1',
        subjectId: 'sub-maths',
        chapterId: 'chap-trig',
        topicId: 'top-identities',
        questionType: QuestionType.NUMERICAL,
        questionText: 'Find the value of $2^{10} - 1000$',
        marks: 2.0,
        negativeMarks: 0.0,
        metadata: { correctValue: 24 },
        options: [],
      };

      mockPrisma.client.question.create.mockResolvedValue(numQuestion);
      mockPrisma.client.question.findUnique.mockResolvedValue(numQuestion);

      const result = await questionsService.create(
        {
          questionText: numQuestion.questionText,
          subjectId: 'sub-maths',
          chapterId: 'chap-trig',
          topicId: 'top-identities',
          questionType: QuestionType.NUMERICAL,
          marks: 2.0,
          negativeMarks: 0.0,
          metadata: { correctValue: 24 },
          options: [],
        },
        mockUserEditor,
      );

      expect(result.questionType).toBe(QuestionType.NUMERICAL);
    });

    it('creates a Statement-based question and a Matching question', async () => {
      const statementQuestion = {
        id: 'q-stmt-1',
        subjectId: 'sub-maths',
        chapterId: 'chap-trig',
        topicId: 'top-identities',
        questionType: QuestionType.STATEMENT_BASED,
        questionText: 'Consider the following statements: 1. Earth rotates west to east. 2. Venus rotates east to west.',
        options: [
          { identifier: 'A', optionText: '1 only', isCorrect: false },
          { identifier: 'B', optionText: 'Both 1 and 2', isCorrect: true },
        ],
      };

      mockPrisma.client.question.create.mockResolvedValue(statementQuestion);
      mockPrisma.client.question.findUnique.mockResolvedValue(statementQuestion);

      const result = await questionsService.create(
        {
          questionText: statementQuestion.questionText,
          subjectId: 'sub-maths',
          chapterId: 'chap-trig',
          topicId: 'top-identities',
          questionType: QuestionType.STATEMENT_BASED,
          options: statementQuestion.options,
        },
        mockUserEditor,
      );

      expect(result.questionType).toBe(QuestionType.STATEMENT_BASED);
    });
  });

  describe('3. Quality Controls & Validation Rules', () => {
    it('rejects if negative marks exceed total question marks', async () => {
      await expect(
        questionsService.create(
          {
            questionText: 'Valid question text',
            subjectId: 'sub-maths',
            chapterId: 'chap-trig',
            topicId: 'top-identities',
            marks: 1.0,
            negativeMarks: 1.5,
            options: [
              { identifier: 'A', optionText: 'Opt 1', isCorrect: true },
              { identifier: 'B', optionText: 'Opt 2', isCorrect: false },
            ],
          },
          mockUserEditor,
        ),
      ).rejects.toThrow('Negative marks cannot exceed total marks');
    });

    it('rejects choice question with fewer than 2 options', async () => {
      await expect(
        questionsService.create(
          {
            questionText: 'Invalid choice count question',
            subjectId: 'sub-maths',
            chapterId: 'chap-trig',
            topicId: 'top-identities',
            questionType: QuestionType.MCQ_SINGLE,
            options: [{ identifier: 'A', optionText: 'Solo option', isCorrect: true }],
          },
          mockUserEditor,
        ),
      ).rejects.toThrow('requires at least 2 options');
    });

    it('rejects choice question with no correct answer marked', async () => {
      await expect(
        questionsService.create(
          {
            questionText: 'No answer designated question',
            subjectId: 'sub-maths',
            chapterId: 'chap-trig',
            topicId: 'top-identities',
            questionType: QuestionType.MCQ_SINGLE,
            options: [
              { identifier: 'A', optionText: 'Option 1', isCorrect: false },
              { identifier: 'B', optionText: 'Option 2', isCorrect: false },
            ],
          },
          mockUserEditor,
        ),
      ).rejects.toThrow('At least one option must be designated as the correct answer');
    });

    it('rejects single-choice MCQ with multiple correct answers marked', async () => {
      await expect(
        questionsService.create(
          {
            questionText: 'Conflicting single choice question',
            subjectId: 'sub-maths',
            chapterId: 'chap-trig',
            topicId: 'top-identities',
            questionType: QuestionType.MCQ_SINGLE,
            options: [
              { identifier: 'A', optionText: 'Option 1', isCorrect: true },
              { identifier: 'B', optionText: 'Option 2', isCorrect: true },
            ],
          },
          mockUserEditor,
        ),
      ).rejects.toThrow('Single-choice MCQ must have exactly one correct option');
    });

    it('rejects question with unbalanced LaTeX math delimiters in questionText', async () => {
      await expect(
        questionsService.create(
          {
            questionText: 'Calculate the value of $x^2 + 2x + 1 when x = 5',
            subjectId: 'sub-maths',
            chapterId: 'chap-trig',
            topicId: 'top-identities',
            questionType: QuestionType.MCQ_SINGLE,
            options: [
              { identifier: 'A', optionText: '36', isCorrect: true },
              { identifier: 'B', optionText: '25', isCorrect: false },
            ],
          },
          mockUserEditor,
        ),
      ).rejects.toThrow('unclosed inline math delimiter');
    });

    it('creates an IMAGE_BASED question with valid image metadata', async () => {
      const imgQ = {
        id: 'q-img-1',
        questionText: 'Identify the command badge shown below:',
        questionType: QuestionType.IMAGE_BASED,
        status: QuestionStatus.DRAFT,
        subjectId: 'sub-maths',
        chapterId: 'chap-trig',
        topicId: 'top-identities',
      };
      mockPrisma.client.question.create.mockResolvedValueOnce(imgQ);
      mockPrisma.client.question.findUnique.mockResolvedValueOnce(imgQ);

      const res = await questionsService.create(
        {
          questionText: 'Identify the command badge shown below:',
          subjectId: 'sub-maths',
          chapterId: 'chap-trig',
          topicId: 'top-identities',
          questionType: QuestionType.IMAGE_BASED,
          metadata: { imageUrl: 'https://cdn.cdsprep.com/assets/badges/army.png' },
          options: [
            { identifier: 'A', optionText: 'Southern Command', isCorrect: true },
            { identifier: 'B', optionText: 'Northern Command', isCorrect: false },
          ],
        },
        mockUserEditor,
      );

      expect(res).toBeDefined();
    });
  });

  describe('4. Duplicate Detection', () => {
    it('detects duplicate question by normalized text within the same topic', async () => {
      mockPrisma.client.question.findMany.mockResolvedValueOnce([
        {
          id: 'existing-q-1',
          questionText: 'What is the speed of light in vacuum?',
        },
      ]);

      await expect(
        questionsService.create(
          {
            questionText: '  what is the SPEED of LIGHT in vacuum? ',
            subjectId: 'sub-maths',
            chapterId: 'chap-trig',
            topicId: 'top-identities',
            options: [
              { identifier: 'A', optionText: '$3 \\times 10^8$ m/s', isCorrect: true },
              { identifier: 'B', optionText: '$3 \\times 10^6$ m/s', isCorrect: false },
            ],
          },
          mockUserEditor,
        ),
      ).rejects.toThrow('Duplicate question detected');
    });
  });

  describe('5. Security, Permissions & Status Lifecycle', () => {
    it('prevents CONTENT_EDITOR from publishing questions directly', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValueOnce({
        id: 'q-draft-1',
        status: QuestionStatus.DRAFT,
      });

      await expect(
        questionsService.updateStatus('q-draft-1', QuestionStatus.PUBLISHED, mockUserEditor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows CONTENT_MANAGER to publish approved questions and records audit log', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValueOnce({
        id: 'q-review-1',
        status: QuestionStatus.APPROVED,
      });
      mockPrisma.client.question.update.mockResolvedValueOnce({
        id: 'q-review-1',
        status: QuestionStatus.PUBLISHED,
      });

      const res = await questionsService.updateStatus(
        'q-review-1',
        QuestionStatus.PUBLISHED,
        mockUserManager,
        'Quality reviewed by manager',
      );

      expect(res.status).toBe(QuestionStatus.PUBLISHED);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        'user-manager-1',
        'question:status_change',
        'QUESTION',
        'q-review-1',
        expect.objectContaining({
          previousStatus: QuestionStatus.APPROVED,
          newStatus: QuestionStatus.PUBLISHED,
        }),
      );
    });

    it('rejects publishing a question that is not yet in APPROVED status', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValueOnce({
        id: 'q-review-1',
        status: QuestionStatus.REVIEW,
      });

      await expect(
        questionsService.updateStatus(
          'q-review-1',
          QuestionStatus.PUBLISHED,
          mockUserManager,
        ),
      ).rejects.toThrow('Only APPROVED content can become PUBLISHED');
    });

    it('prevents CONTENT_EDITOR from editing PUBLISHED production questions', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValueOnce({
        id: 'q-prod-1',
        status: QuestionStatus.PUBLISHED,
        subjectId: 'sub-maths',
        chapterId: 'chap-trig',
        topicId: 'top-identities',
      });

      await expect(
        questionsService.update('q-prod-1', { questionText: 'Hacked question text' }, mockUserEditor),
      ).rejects.toThrow('Only authorized Content Managers can modify production');
    });

    it('allows CONTENT_MANAGER to edit PUBLISHED production questions and logs audit', async () => {
      const prodQuestion = {
        id: 'q-prod-1',
        status: QuestionStatus.PUBLISHED,
        subjectId: 'sub-maths',
        chapterId: 'chap-trig',
        topicId: 'top-identities',
        questionText: 'Original text',
      };

      mockPrisma.client.question.findUnique.mockResolvedValue(prodQuestion);
      mockPrisma.client.question.update.mockResolvedValue({
        ...prodQuestion,
        questionText: 'Refined production text with typo fix',
      });

      const updated = await questionsService.update(
        'q-prod-1',
        { questionText: 'Refined production text with typo fix' },
        mockUserManager,
      );

      expect(updated).toBeDefined();
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        'user-manager-1',
        'question:update',
        'QUESTION',
        'q-prod-1',
        expect.any(Object),
      );
    });

    it('archives a question when authorized and records audit log', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValueOnce({
        id: 'q-old-1',
        status: QuestionStatus.PUBLISHED,
      });
      mockPrisma.client.question.update.mockResolvedValueOnce({
        id: 'q-old-1',
        status: QuestionStatus.ARCHIVED,
      });

      const res = await questionsService.archive('q-old-1', mockUserManager);
      expect(res.status).toBe(QuestionStatus.ARCHIVED);
    });
  });

  describe('6. Bulk Import Engine & Dry-Run Validation', () => {
    it('performs dry-run validation on CSV input and returns counts & itemized errors', async () => {
      const csvData = `
question,subject,topic,options,correctAnswer,type,difficulty
"What is the capital of India?",General Knowledge,Trigonometric Identities,"A: New Delhi | B: Mumbai | C: Kolkata | D: Chennai",A,MCQ_SINGLE,EASY
"Short?",Elementary Mathematics,Trigonometric Identities,"A: 1 | B: 2",A,MCQ_SINGLE,EASY
"Invalid question without options",Elementary Mathematics,Trigonometric Identities,"",A,MCQ_SINGLE,MEDIUM
"Duplicate question test",Elementary Mathematics,Trigonometric Identities,"A: 1 | B: 2",A,MCQ_SINGLE,EASY
"Duplicate question test",Elementary Mathematics,Trigonometric Identities,"A: 1 | B: 2",A,MCQ_SINGLE,EASY
`.trim();

      const dryRunResult = await questionsService.validateBulkImport({ csvContent: csvData });

      expect(dryRunResult.total).toBe(5);
      expect(dryRunResult.duplicates).toBeGreaterThanOrEqual(1);
      expect(dryRunResult.invalid).toBeGreaterThanOrEqual(1);
      expect(dryRunResult.errors.length).toBeGreaterThan(0);
      expect(dryRunResult.errors.some((e) => e.field === 'options')).toBe(true);
      expect(dryRunResult.errors.some((e) => e.field === 'duplicate')).toBe(true);
    });

    it('performs dry-run validation on JSON payload', async () => {
      const jsonData = [
        {
          questionText: 'What is the square root of 144?',
          subject: 'elementary-maths',
          topic: 'trigonometric-identities',
          options: [
            { identifier: 'A', optionText: '12', isCorrect: true },
            { identifier: 'B', optionText: '14', isCorrect: false },
          ],
          questionType: 'MCQ_SINGLE',
          difficulty: 'EASY',
        },
      ];

      const dryRun = await questionsService.validateBulkImport({ data: jsonData });
      expect(dryRun.total).toBe(1);
      expect(dryRun.valid).toBe(1);
      expect(dryRun.invalid).toBe(0);
      expect(dryRun.validPreview.length).toBe(1);
    });

    it('executes bulk import transactional commit and creates audit log', async () => {
      const validBatch = [
        {
          questionText: 'What is $5 \\times 5$?',
          subject: 'elementary-maths',
          topic: 'trigonometric-identities',
          options: 'A: 25 | B: 20 | C: 15 | D: 10',
          correctAnswer: 'A',
          difficulty: 'EASY',
        },
      ];

      mockPrisma.client.question.create.mockResolvedValueOnce({ id: 'imported-q-1' });

      const commitResult = await questionsService.commitBulkImport(
        { data: validBatch },
        mockUserManager,
      );

      expect(commitResult.importedCount).toBe(1);
      expect(commitResult.skippedCount).toBe(0);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        'user-manager-1',
        'question:bulk_import',
        'QUESTION',
        'BATCH',
        expect.objectContaining({ importedCount: 1 }),
      );
    });
  });
});
