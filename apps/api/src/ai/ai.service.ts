import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AIProvider,
  getAIProvider,
  AICostTracker,
  QuestionExplanationService,
  AIStudyAssistantService,
  QuestionGeneratorService,
  ExplanationMode,
} from '@cdsprep/ai';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  ExplainQuestionDto,
  StudyAssistantQueryDto,
  AdminGenerateQuestionsDto,
  AdminSaveGeneratedQuestionsDto,
} from './dto/ai.dto';
import { QuestionStatus, QuestionType, DifficultyLevel, AttemptStatus } from '@cdsprep/types';

@Injectable()
export class AiService {
  private readonly aiProvider: AIProvider;
  private readonly costTracker: AICostTracker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    const providerName = process.env.AI_PROVIDER || 'mock';
    const apiKey =
      process.env.OPENAI_API_KEY || process.env.AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const model = process.env.AI_MODEL || process.env.AI_MODEL_NAME;
    const timeoutMs = process.env.AI_TIMEOUT_MS ? Number(process.env.AI_TIMEOUT_MS) : 15000;

    this.aiProvider = getAIProvider(providerName, {
      apiKey,
      defaultModel: model,
      timeoutMs,
    });

    const dailyLimit = process.env.AI_DAILY_USER_LIMIT ? Number(process.env.AI_DAILY_USER_LIMIT) : 50;
    const monthlyLimit = process.env.AI_MONTHLY_USER_LIMIT ? Number(process.env.AI_MONTHLY_USER_LIMIT) : 500;
    this.costTracker = new AICostTracker({ dailyQueryLimit: dailyLimit, monthlyQueryLimit: monthlyLimit });
  }

  /**
   * Generates a pedagogical AI explanation across 6 modes for an authorized question.
   * Never exposes user secrets, tokens, or PII.
   */
  async explainQuestion(userId: string, dto: ExplainQuestionDto) {
    const quota = this.costTracker.checkQuota(userId);
    if (!quota.allowed) {
      throw new ForbiddenException(quota.message || 'Daily AI quota exceeded');
    }

    const question = await this.prisma.client.question.findUnique({
      where: { id: dto.questionId },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        explanation: true,
        subject: true,
        chapter: true,
        topic: true,
      },
    });

    if (!question) {
      throw new NotFoundException(`Question not found with ID ${dto.questionId}`);
    }

    const correctOption = question.options.find((o) => o.isCorrect);

    const result = await QuestionExplanationService.explain(this.aiProvider, {
      questionText: question.questionText,
      subjectName: question.subject.name,
      topicName: question.topic.name,
      options: question.options.map((o) => ({
        identifier: o.identifier,
        text: o.optionText,
        isCorrect: o.isCorrect,
      })),
      correctOptionIdentifier: correctOption?.identifier || 'A',
      officialExplanation: question.explanation?.explanation,
      mode: (dto.mode || 'explain') as ExplanationMode,
      userQuery: dto.query,
    });

    // Authoritative interaction logging (no secret tokens logged)
    await this.prisma.client.aIInteraction.create({
      data: {
        userId,
        questionId: question.id,
        promptType: `EXPLAIN_${(dto.mode || 'explain').toUpperCase()}`,
        promptText: `Question: ${question.questionText.slice(0, 120)} | Mode: ${dto.mode || 'explain'}`,
        responseText: JSON.stringify(result.data).slice(0, 4000),
        tokenCost: result.tokenCost.totalTokens,
      },
    });

    return {
      data: result.data,
      isMathValid: result.isMathValid,
      mathErrors: result.mathErrors,
      model: result.model,
    };
  }

  /**
   * Provides personalized study advice based strictly on candidate's authorized metrics.
   * Completely isolated per student.
   */
  async askStudyAssistant(userId: string, dto: StudyAssistantQueryDto) {
    const quota = this.costTracker.checkQuota(userId);
    if (!quota.allowed) {
      throw new ForbiddenException(quota.message || 'Daily AI quota exceeded');
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        targetAcademy: true,
        currentStreak: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // 1. Gather historical attempts and results
    const results = await this.prisma.client.result.findMany({
      where: { attempt: { userId } },
      select: {
        netScore: true,
        accuracyPercent: true,
        attemptedCount: true,
      },
    });

    const testsCompleted = results.length;
    const questionsSolved = results.reduce((acc, r) => acc + r.attemptedCount, 0);
    const overallAccuracy =
      testsCompleted > 0
        ? parseFloat(
            (results.reduce((acc, r) => acc + Number(r.accuracyPercent), 0) / testsCompleted).toFixed(1)
          )
        : 0;

    // 2. Aggregate weak topics from ResultTopic
    const topicBreakdowns = await this.prisma.client.resultTopic.findMany({
      where: { result: { attempt: { userId } } },
      select: {
        topicName: true,
        totalQuestions: true,
        correctCount: true,
      },
    });

    const topicMap: Record<string, { attempted: number; correct: number }> = {};
    for (const tb of topicBreakdowns) {
      if (!topicMap[tb.topicName]) {
        topicMap[tb.topicName] = { attempted: 0, correct: 0 };
      }
      topicMap[tb.topicName].attempted += tb.totalQuestions;
      topicMap[tb.topicName].correct += tb.correctCount;
    }

    const weakTopics = Object.entries(topicMap)
      .map(([topicName, stats]) => {
        const accuracy =
          stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;
        return {
          topicName,
          accuracy,
          totalAttempts: stats.attempted,
        };
      })
      .filter((t) => t.totalAttempts >= 3 && t.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    // 3. Compute today's daily goals progress
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [testsToday, practiceAnswersToday, testAnswersToday] = await Promise.all([
      this.prisma.client.testAttempt.count({
        where: {
          userId,
          status: AttemptStatus.SUBMITTED,
          submittedAt: { gte: startOfToday },
        },
      }),
      this.prisma.client.practiceAnswer.count({
        where: {
          session: { userId },
          answeredAt: { gte: startOfToday },
        },
      }),
      this.prisma.client.attemptAnswer.count({
        where: {
          attempt: { userId },
          createdAt: { gte: startOfToday },
        },
      }),
    ]);

    const questionsSolvedToday = practiceAnswersToday + testAnswersToday;
    const studyMinutesToday = Math.round(questionsSolvedToday * 1.5 + testsToday * 60);

    // 4. Fetch recent mistakes summary
    const recentMistakes = await this.prisma.client.mistake.findMany({
      where: { userId, status: 'ACTIVE' },
      take: 5,
      include: { question: { include: { topic: true } } },
      orderBy: { lastMistakeAt: 'desc' },
    });

    const recentMistakesSummary = Array.from(
      new Set(
        recentMistakes
          .map((m) => m.question?.topic?.name)
          .filter((name): name is string => Boolean(name))
      )
    );

    const result = await AIStudyAssistantService.advise(this.aiProvider, {
      studentName: user.fullName,
      targetAcademy: user.targetAcademy || 'IMA',
      streakDays: user.currentStreak || 1,
      overallAccuracy,
      questionsSolved,
      testsCompleted,
      weakTopics,
      dailyGoals: {
        questionsSolvedToday,
        questionTarget: 25,
        testsCompletedToday: testsToday,
        testTarget: 1,
        studyMinutesToday,
        studyMinuteTarget: 45,
      },
      recentMistakesSummary,
      queryType: (dto.queryType || 'study_today') as any,
      userMessage: dto.message,
    });

    // Authoritative interaction logging
    await this.prisma.client.aIInteraction.create({
      data: {
        userId,
        promptType: `ASSISTANT_${(dto.queryType || 'study_today').toUpperCase()}`,
        promptText: `Intent: ${dto.queryType || 'study_today'} | Message: ${dto.message || 'none'}`,
        responseText: JSON.stringify(result.data).slice(0, 4000),
        tokenCost: result.tokenCost.totalTokens,
      },
    });

    return {
      data: result.data,
      tokenCost: result.tokenCost,
      model: result.model,
    };
  }

  /**
   * Admin workflow: Generates candidate questions with deterministic schema and math verification.
   * Generated items are marked for review and are NEVER published automatically.
   */
  async generateQuestionsForAdmin(adminUser: AuthenticatedUser, dto: AdminGenerateQuestionsDto) {
    const [subject, topic] = await Promise.all([
      this.prisma.client.subject.findUnique({ where: { id: dto.subjectId } }),
      this.prisma.client.topic.findUnique({ where: { id: dto.topicId } }),
    ]);

    if (!subject || !topic) {
      throw new NotFoundException('Specified Subject or Topic was not found');
    }

    let chapterName: string | undefined;
    if (dto.chapterId) {
      const chapter = await this.prisma.client.chapter.findUnique({ where: { id: dto.chapterId } });
      chapterName = chapter?.name;
    }

    // Retrieve recent questions under this topic for duplicate detection
    const existing = await this.prisma.client.question.findMany({
      where: { topicId: dto.topicId, deletedAt: null },
      take: 25,
      select: { questionText: true },
    });

    const existingQuestionSnippets = existing.map((q) => q.questionText);

    const result = await QuestionGeneratorService.generate(this.aiProvider, {
      subject: subject.name,
      chapter: chapterName,
      topic: topic.name,
      difficulty: dto.difficulty || 'MEDIUM',
      questionType: dto.questionType || 'MCQ',
      count: dto.count || 2,
      existingQuestionSnippets,
    });

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      topicId: topic.id,
      topicName: topic.name,
      ...result,
    };
  }

  /**
   * Admin workflow: Commits approved AI-generated questions to the database as DRAFT or REVIEW.
   */
  async saveApprovedQuestions(adminUser: AuthenticatedUser, dto: AdminSaveGeneratedQuestionsDto) {
    if (!dto.questions || dto.questions.length === 0) {
      throw new BadRequestException('No candidate questions provided to save');
    }

    const [subject, topic] = await Promise.all([
      this.prisma.client.subject.findUnique({ where: { id: dto.subjectId } }),
      this.prisma.client.topic.findUnique({ where: { id: dto.topicId } }),
    ]);

    if (!subject || !topic) {
      throw new NotFoundException('Specified Subject or Topic not found');
    }

    const createdQuestions = await this.prisma.client.$transaction(async (tx) => {
      const saved = [];
      for (const q of dto.questions) {
        const questionType =
          q.questionType === 'NUMERICAL' ? QuestionType.NUMERICAL : QuestionType.MCQ_SINGLE;

        const newQ = await tx.question.create({
          data: {
            questionText: q.questionText,
            subjectId: dto.subjectId,
            chapterId: dto.chapterId,
            topicId: dto.topicId,
            questionType,
            marks: 1.0,
            negativeMarks: 0.33,
            difficulty: (q.difficulty as DifficultyLevel) || DifficultyLevel.MEDIUM,
            status: QuestionStatus.DRAFT_AI, // AI questions are always DRAFT_AI until human review
            source: 'AI_SYNTHESIZER',
            exam: null,
            year: null,
            language: 'en',
            createdById: adminUser.id,
            metadata: {
              isAIGenerated: true,
              isOfficialPYQ: false,
              generatedAt: new Date().toISOString(),
              generatedById: adminUser.id,
            },
            options: {
              create: q.options.map((opt, idx) => ({
                identifier: opt.identifier,
                optionText: opt.text,
                isCorrect: opt.identifier === q.correctAnswer,
                orderIndex: idx,
              })),
            },
            explanation: {
              create: {
                explanation: q.explanation,
                keyConcept: `${subject.name} — ${topic.name}`,
              },
            },
          },
        });
        saved.push(newQ);
      }
      return saved;
    });

    await this.auditService.logAction(
      adminUser.id,
      'AI_QUESTIONS_COMMITTED',
      'Question',
      createdQuestions[0]?.id || 'batch',
      { count: createdQuestions.length, subjectId: dto.subjectId, topicId: dto.topicId }
    );

    return {
      success: true,
      count: createdQuestions.length,
      status: QuestionStatus.DRAFT,
      questionIds: createdQuestions.map((q) => q.id),
    };
  }

  async listRecommendations(userId: string) {
    return this.prisma.client.aIRecommendation.findMany({
      where: { userId, isDismissed: false },
      orderBy: { priorityScore: 'desc' },
      include: {
        topic: true,
        question: true,
      },
    });
  }
}
