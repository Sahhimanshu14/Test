import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiService } from '../src/ai/ai.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RoleType, QuestionStatus, QuestionType } from '@cdsprep/types';
import { ExplanationModeDtoEnum, StudyAssistantQueryDtoEnum } from '../src/ai/dto/ai.dto';

describe('Phase 11 — AI Features & Pedagogy Subsystem Suite', () => {
  let aiService: AiService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockUser = {
    id: 'user-cadet-101',
    email: 'cadet.vikram@cdsprep.in',
    fullName: 'Cadet Vikram Batra',
    roles: [RoleType.STUDENT],
    targetAcademy: 'IMA',
    currentStreak: 5,
  };

  const mockAdminUser = {
    id: 'user-admin-999',
    email: 'chief.editor@cdsprep.in',
    fullName: 'Brigadier Admin',
    roles: [RoleType.ADMIN, RoleType.CONTENT_EDITOR],
    targetAcademy: 'IMA',
    currentStreak: 12,
  };

  const mockQuestion = {
    id: 'q-train-01',
    questionText: 'A train running at 54 km/h takes 20 seconds to pass a platform 150 meters long. What is the length of the train?',
    subject: { id: 'sub-math', name: 'Elementary Mathematics' },
    chapter: { id: 'chap-arith', name: 'Arithmetic' },
    topic: { id: 'top-speed', name: 'Speed, Distance & Time' },
    options: [
      { id: 'opt-1', identifier: 'A', optionText: '120 m', isCorrect: false, orderIndex: 0 },
      { id: 'opt-2', identifier: 'B', optionText: '150 m', isCorrect: true, orderIndex: 1 },
      { id: 'opt-3', identifier: 'C', optionText: '180 m', isCorrect: false, orderIndex: 2 },
      { id: 'opt-4', identifier: 'D', optionText: '200 m', isCorrect: false, orderIndex: 3 },
    ],
    explanation: {
      explanation: 'Speed in m/s = 54 * 5/18 = 15 m/s. Distance = 15 * 20 = 300 m. Train length = 300 - 150 = 150 m.',
    },
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        question: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          create: vi.fn(),
        },
        user: {
          findUnique: vi.fn(),
        },
        result: {
          findMany: vi.fn(),
        },
        resultTopic: {
          findMany: vi.fn(),
        },
        testAttempt: {
          count: vi.fn(),
        },
        practiceAnswer: {
          count: vi.fn(),
        },
        attemptAnswer: {
          count: vi.fn(),
        },
        mistake: {
          findMany: vi.fn(),
        },
        subject: {
          findUnique: vi.fn(),
        },
        chapter: {
          findUnique: vi.fn(),
        },
        topic: {
          findUnique: vi.fn(),
        },
        aIInteraction: {
          create: vi.fn().mockResolvedValue({ id: 'ai-interaction-1' }),
        },
        aIRecommendation: {
          findMany: vi.fn(),
        },
        $transaction: vi.fn((callback) => callback(mockPrisma.client)),
      },
    };

    mockAudit = {
      logAction: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
    };

    aiService = new AiService(mockPrisma as unknown as PrismaService, mockAudit as unknown as AuditService);
  });

  describe('1. AI Question Explanation (6 Pedagogical Modes)', () => {
    it('generates structured explanation for mode "explain" and logs AI interaction', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await aiService.explainQuestion(mockUser.id, {
        questionId: mockQuestion.id,
        mode: ExplanationModeDtoEnum.EXPLAIN,
      });

      expect(result.data.mode).toBe('explain');
      expect(result.data.explanation.length).toBeGreaterThan(10);
      expect(result.data.stepByStep.length).toBeGreaterThan(0);
      expect(result.isMathValid).toBe(true);
      expect(result.model).toBe('mock-cds-model-v1');

      // Verify AI Interaction is logged without credentials
      expect(mockPrisma.client.aIInteraction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          questionId: mockQuestion.id,
          promptType: 'EXPLAIN_EXPLAIN',
        }),
      });
    });

    it('generates simple beginner-friendly explanation for mode "simple"', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await aiService.explainQuestion(mockUser.id, {
        questionId: mockQuestion.id,
        mode: ExplanationModeDtoEnum.SIMPLE,
      });

      expect(result.data.mode).toBe('simple');
      expect(result.data.explanation).toBeDefined();
      expect(mockPrisma.client.aIInteraction.create).toHaveBeenCalled();
    });

    it('generates distractor elimination breakdown for mode "why_wrong"', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await aiService.explainQuestion(mockUser.id, {
        questionId: mockQuestion.id,
        mode: ExplanationModeDtoEnum.WHY_WRONG,
      });

      expect(result.data.mode).toBe('why_wrong');
      expect(result.data.whyOptionsWrong?.length).toBeGreaterThan(0);
    });

    it('generates drill question on same concept for mode "similar_question"', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await aiService.explainQuestion(mockUser.id, {
        questionId: mockQuestion.id,
        mode: ExplanationModeDtoEnum.SIMILAR_QUESTION,
      });

      expect(result.data.mode).toBe('similar_question');
      expect(result.data.similarQuestion).toBeDefined();
      expect(result.data.similarQuestion?.options.length).toBeGreaterThan(1);
    });

    it('throws NotFoundException when question does not exist', async () => {
      mockPrisma.client.question.findUnique.mockResolvedValue(null);

      await expect(
        aiService.explainQuestion(mockUser.id, {
          questionId: 'non-existent-id',
          mode: ExplanationModeDtoEnum.EXPLAIN,
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. AI Study Assistant & Personalization', () => {
    beforeEach(() => {
      mockPrisma.client.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.client.result.findMany.mockResolvedValue([
        { score: 145, accuracy: 72.5, attempted: 90 },
        { score: 130, accuracy: 65.0, attempted: 90 },
      ]);
      mockPrisma.client.resultTopic.findMany.mockResolvedValue([
        { topicName: 'Modern Indian History', attempted: 20, correct: 9 }, // 45% -> weak
        { topicName: 'Trigonometry', attempted: 15, correct: 8 },          // 53% -> weak
        { topicName: 'Sentence Improvement', attempted: 25, correct: 21 }, // 84% -> strong
      ]);
      mockPrisma.client.testAttempt.count.mockResolvedValue(0);
      mockPrisma.client.practiceAnswer.count.mockResolvedValue(10);
      mockPrisma.client.attemptAnswer.count.mockResolvedValue(0);
      mockPrisma.client.mistake.findMany.mockResolvedValue([
        { topic: { name: 'Modern Indian History' } },
        { topic: { name: 'Trigonometry' } },
      ]);
    });

    it('provides tailored study guidance for query "study_today"', async () => {
      const result = await aiService.askStudyAssistant(mockUser.id, {
        queryType: StudyAssistantQueryDtoEnum.STUDY_TODAY,
      });

      expect(result.data.intent).toBe('study_today');
      expect(result.data.summary.length).toBeGreaterThan(15);
      expect(result.data.recommendedActions.length).toBeGreaterThan(0);
      expect(result.data.suggestedTopics.length).toBeGreaterThan(0);
      expect(result.tokenCost.totalTokens).toBeGreaterThan(0);

      expect(mockPrisma.client.aIInteraction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          promptType: 'ASSISTANT_STUDY_TODAY',
        }),
      });
    });

    it('provides multi-day revision schedule for query "revision_plan"', async () => {
      const result = await aiService.askStudyAssistant(mockUser.id, {
        queryType: StudyAssistantQueryDtoEnum.REVISION_PLAN,
      });

      expect(result.data.intent).toBe('revision_plan');
      expect(result.data.revisionSchedule?.length).toBeGreaterThan(0);
    });

    it('throws NotFoundException if user is not found', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue(null);

      await expect(
        aiService.askStudyAssistant('non-existent-user', {
          queryType: StudyAssistantQueryDtoEnum.STUDY_TODAY,
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. Admin Question Generation & Deterministic Verification', () => {
    it('generates verified candidate questions and flags duplicates against question bank', async () => {
      mockPrisma.client.subject.findUnique.mockResolvedValue({
        id: 'sub-math',
        name: 'Elementary Mathematics',
      });
      mockPrisma.client.topic.findUnique.mockResolvedValue({
        id: 'top-speed',
        name: 'Speed, Distance & Time',
      });
      mockPrisma.client.question.findMany.mockResolvedValue([
        { questionText: 'What is the sum of angles of a triangle?' },
      ]);

      const result = await aiService.generateQuestionsForAdmin(mockAdminUser as any, {
        subjectId: 'sub-math',
        topicId: 'top-speed',
        difficulty: 'MEDIUM',
        questionType: 'MCQ',
        count: 2,
      });

      expect(result.subjectName).toBe('Elementary Mathematics');
      expect(result.topicName).toBe('Speed, Distance & Time');
      expect(result.totalGenerated).toBe(2);
      expect(result.questions.length).toBe(2);

      const q = result.questions[0];
      expect(q.options.length).toBe(4);
      expect(q.isMathValid).toBe(true);
      expect(q.verificationBadge).toBe('VERIFIED');
    });

    it('rejects question generation when subject or topic does not exist', async () => {
      mockPrisma.client.subject.findUnique.mockResolvedValue(null);
      mockPrisma.client.topic.findUnique.mockResolvedValue(null);

      await expect(
        aiService.generateQuestionsForAdmin(mockAdminUser as any, {
          subjectId: 'missing-sub',
          topicId: 'missing-top',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. Admin Committing Approved Questions (DRAFT Status)', () => {
    it('saves approved questions as DRAFT and records audit log', async () => {
      mockPrisma.client.subject.findUnique.mockResolvedValue({ id: 'sub-1', name: 'English' });
      mockPrisma.client.topic.findUnique.mockResolvedValue({ id: 'top-1', name: 'Idioms' });
      mockPrisma.client.question.create.mockResolvedValue({ id: 'new-q-101' });

      const saveDto = {
        subjectId: 'sub-1',
        chapterId: 'chap-1',
        topicId: 'top-1',
        questions: [
          {
            questionText: 'Choose the correct meaning of "To beat around the bush":',
            options: [
              { identifier: 'A', text: 'To avoid the main topic' },
              { identifier: 'B', text: 'To clean a garden' },
              { identifier: 'C', text: 'To walk in a forest' },
              { identifier: 'D', text: 'To search aimlessly' },
            ],
            correctAnswer: 'A',
            explanation: '"To beat around the bush" means to discuss a matter without coming to the point.',
          },
        ],
      };

      const result = await aiService.saveApprovedQuestions(mockAdminUser as any, saveDto as any);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.status).toBe(QuestionStatus.DRAFT); // NEVER published automatically
      expect(mockPrisma.client.question.create).toHaveBeenCalled();
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        mockAdminUser.id,
        'AI_QUESTIONS_COMMITTED',
        'Question',
        expect.any(String),
        expect.objectContaining({ count: 1 })
      );
    });

    it('rejects saving when questions array is empty', async () => {
      await expect(
        aiService.saveApprovedQuestions(mockAdminUser as any, {
          subjectId: 'sub-1',
          chapterId: 'chap-1',
          topicId: 'top-1',
          questions: [],
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
