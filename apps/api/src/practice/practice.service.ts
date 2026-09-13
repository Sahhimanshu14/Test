import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PracticeMode,
  DifficultyLevel,
  MistakeStatus,
  QuestionStatus,
} from '@cdsprep/types';
import {
  CreatePracticeSessionDto,
  SubmitPracticeAnswerDto,
  CreateQuestionReportDto,
  PracticeHistoryQueryDto,
} from './dto/practice.dto';
import { calculateStreakUpdate } from '../common/utils/streak.util';

@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}

  private async recordActivity(userId: string) {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, highestStreak: true, lastActiveDate: true },
      });
      if (user) {
        const update = calculateStreakUpdate(
          user.currentStreak,
          user.highestStreak,
          user.lastActiveDate,
        );
        if (update.streakIncreased || !user.lastActiveDate) {
          await this.prisma.client.user.update({
            where: { id: userId },
            data: {
              currentStreak: update.currentStreak,
              highestStreak: update.highestStreak,
              lastActiveDate: update.lastActiveDate,
            },
          });
        }
      }
    } catch {
      // Non-fatal
    }
  }

  /**
   * Initialize a new practice session with configured filters and question sampling
   */
  async createSession(userId: string, dto: CreatePracticeSessionDto) {
    const mode = dto.mode || PracticeMode.ALL_QUESTIONS;
    const questionCount = Math.min(Math.max(dto.questionCount || 10, 1), 100);

    // Build question query criteria
    const baseWhere: any = {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
    };

    if (dto.difficulty) {
      baseWhere.difficulty = dto.difficulty;
    }

    if (dto.subjectId) {
      baseWhere.subjectId = dto.subjectId;
    }
    if (dto.chapterId) {
      baseWhere.chapterId = dto.chapterId;
    }
    if (dto.topicId) {
      baseWhere.topicId = dto.topicId;
    }

    // Mode-specific criteria
    switch (mode) {
      case PracticeMode.BOOKMARKS:
        baseWhere.bookmarks = { some: { userId } };
        break;

      case PracticeMode.MISTAKES:
        baseWhere.mistakes = { some: { userId, status: MistakeStatus.ACTIVE } };
        break;

      case PracticeMode.PYQ:
        baseWhere.OR = [
          { year: { not: null } },
          { pyqQuestions: { some: {} } },
        ];
        break;

      case PracticeMode.SUBJECT:
        if (!dto.subjectId) {
          throw new BadRequestException('subjectId is required for SUBJECT practice mode');
        }
        break;

      case PracticeMode.CHAPTER:
        if (!dto.chapterId) {
          throw new BadRequestException('chapterId is required for CHAPTER practice mode');
        }
        break;

      case PracticeMode.TOPIC:
        if (!dto.topicId) {
          throw new BadRequestException('topicId is required for TOPIC practice mode');
        }
        break;

      case PracticeMode.DIFFICULTY:
        if (!dto.difficulty) {
          throw new BadRequestException('difficulty is required for DIFFICULTY practice mode');
        }
        break;

      case PracticeMode.ALL_QUESTIONS:
      case PracticeMode.CUSTOM:
      default:
        // Already filtered by baseWhere
        break;
    }

    // Query lightweight question candidates
    const candidateQuestions = await this.prisma.client.question.findMany({
      where: baseWhere,
      select: { id: true },
      take: 200, // Fetch up to 200 candidate IDs for in-memory sampling
    });

    if (candidateQuestions.length === 0) {
      let msg = 'No questions found matching the selected practice criteria';
      if (mode === PracticeMode.BOOKMARKS) {
        msg = 'You do not have any bookmarked questions to practice yet.';
      } else if (mode === PracticeMode.MISTAKES) {
        msg = 'No active mistakes in your notebook to practice. Keep up the good work!';
      }
      throw new BadRequestException(msg);
    }

    let selectedIds = candidateQuestions.map((q) => q.id);

    // Randomize if requested
    if (dto.randomize !== false) {
      for (let i = selectedIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = selectedIds[i]!;
        selectedIds[i] = selectedIds[j]!;
        selectedIds[j] = temp;
      }
    }

    // Slice to desired questionCount
    selectedIds = selectedIds.slice(0, questionCount);

    // Create session and answer shells in a transaction
    const session = await this.prisma.client.$transaction(async (tx) => {
      const createdSession = await tx.practiceSession.create({
        data: {
          userId,
          mode,
          subjectId: dto.subjectId || null,
          chapterId: dto.chapterId || null,
          topicId: dto.topicId || null,
          difficulty: dto.difficulty || null,
          questionCount: selectedIds.length,
          randomize: dto.randomize !== false,
          timeLimitMinutes: dto.timeLimitMinutes || null,
          enableNegativeMarking: Boolean(dto.enableNegativeMarking),
        },
      });

      const answersData = selectedIds.map((qId, idx) => ({
        sessionId: createdSession.id,
        questionId: qId,
        orderIndex: idx,
      }));

      await tx.practiceAnswer.createMany({
        data: answersData,
      });

      return createdSession;
    });

    // Return session with sanitized questions
    return this.getSession(userId, session.id);
  }

  /**
   * Retrieve session with current answers and sanitized/revealed questions
   */
  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.client.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        chapter: { select: { id: true, name: true, slug: true } },
        topic: { select: { id: true, name: true, slug: true } },
        answers: {
          orderBy: { orderIndex: 'asc' },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { orderIndex: 'asc' },
                },
                explanation: true,
                subject: { select: { id: true, name: true, slug: true } },
                chapter: { select: { id: true, name: true, slug: true } },
                topic: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Practice session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this practice session');
    }

    // Sanitize question data if session is not yet completed
    const sanitizedAnswers = session.answers.map((ans) => {
      const q = ans.question;
      const isAnswerEvaluated = ans.selectedOptionId !== null && ans.isCorrect !== null;
      const shouldReveal = session.isCompleted || isAnswerEvaluated;

      return {
        id: ans.id,
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId,
        isCorrect: shouldReveal ? ans.isCorrect : null,
        timeSpentSeconds: ans.timeSpentSeconds,
        isMarkedForReview: ans.isMarkedForReview,
        orderIndex: ans.orderIndex,
        answeredAt: ans.answeredAt,
        question: {
          id: q.id,
          questionType: q.questionType,
          questionText: q.questionText,
          marks: Number(q.marks),
          negativeMarks: Number(q.negativeMarks),
          difficulty: q.difficulty,
          subject: q.subject,
          chapter: q.chapter,
          topic: q.topic,
          options: q.options.map((opt) => ({
            id: opt.id,
            identifier: opt.identifier,
            optionText: opt.optionText,
            orderIndex: opt.orderIndex,
            // Only reveal isCorrect if answer has been evaluated or session is completed
            ...(shouldReveal ? { isCorrect: opt.isCorrect } : {}),
          })),
          // Reveal explanation only after answer is submitted or session completed
          explanation: shouldReveal ? q.explanation : null,
        },
      };
    });

    return {
      session: {
        id: session.id,
        userId: session.userId,
        mode: session.mode,
        subjectId: session.subjectId,
        chapterId: session.chapterId,
        topicId: session.topicId,
        difficulty: session.difficulty,
        questionCount: session.questionCount,
        randomize: session.randomize,
        timeLimitMinutes: session.timeLimitMinutes,
        enableNegativeMarking: session.enableNegativeMarking,
        isCompleted: session.isCompleted,
        score: Number(session.score),
        negativeMarks: Number(session.negativeMarks),
        correctCount: session.correctCount,
        incorrectCount: session.incorrectCount,
        unattemptedCount: session.unattemptedCount,
        totalTimeSpentSeconds: session.totalTimeSpentSeconds,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        subject: session.subject,
        chapter: session.chapter,
        topic: session.topic,
      },
      answers: sanitizedAnswers,
    };
  }

  /**
   * Submit or clear an answer authoritatively on the backend
   */
  async submitAnswer(userId: string, sessionId: string, dto: SubmitPracticeAnswerDto) {
    const session = await this.prisma.client.practiceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Practice session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this practice session');
    }

    if (session.isCompleted) {
      throw new BadRequestException('Cannot submit answers for a completed practice session');
    }

    const practiceAnswer = await this.prisma.client.practiceAnswer.findUnique({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: dto.questionId,
        },
      },
    });

    if (!practiceAnswer) {
      throw new BadRequestException('Question does not belong to this practice session');
    }

    // 1. Handling Answer Clearing
    if (!dto.selectedOptionId) {
      const updated = await this.prisma.client.practiceAnswer.update({
        where: { id: practiceAnswer.id },
        data: {
          selectedOptionId: null,
          isCorrect: null,
          timeSpentSeconds: { increment: dto.timeSpentSeconds || 0 },
          isMarkedForReview: Boolean(dto.isMarkedForReview),
        },
      });

      return {
        success: true,
        cleared: true,
        answer: updated,
      };
    }

    // 2. Authoritative Server Evaluation
    const selectedOption = await this.prisma.client.questionOption.findFirst({
      where: {
        id: dto.selectedOptionId,
        questionId: dto.questionId,
      },
    });

    if (!selectedOption) {
      throw new BadRequestException('Selected option does not belong to this question');
    }

    const isCorrect = Boolean(selectedOption.isCorrect);

    // Update PracticeAnswer record
    const updatedAnswer = await this.prisma.client.practiceAnswer.update({
      where: { id: practiceAnswer.id },
      data: {
        selectedOptionId: dto.selectedOptionId,
        isCorrect,
        timeSpentSeconds: { increment: dto.timeSpentSeconds || 0 },
        isMarkedForReview: Boolean(dto.isMarkedForReview),
        answeredAt: new Date(),
      },
    });

    // 3. Automatic Mistake Notebook Synchronization
    if (!isCorrect) {
      await this.prisma.client.mistake.upsert({
        where: {
          userId_questionId: {
            userId,
            questionId: dto.questionId,
          },
        },
        update: {
          status: MistakeStatus.ACTIVE,
          failedCount: { increment: 1 },
          lastMistakeAt: new Date(),
        },
        create: {
          userId,
          questionId: dto.questionId,
          status: MistakeStatus.ACTIVE,
          failedCount: 1,
          lastMistakeAt: new Date(),
        },
      });
    } else {
      // If user had this question in mistake notebook, update status to RETRY_CORRECT
      const existingMistake = await this.prisma.client.mistake.findUnique({
        where: {
          userId_questionId: {
            userId,
            questionId: dto.questionId,
          },
        },
      });

      if (existingMistake && existingMistake.status === MistakeStatus.ACTIVE) {
        await this.prisma.client.mistake.update({
          where: { id: existingMistake.id },
          data: {
            status: MistakeStatus.RETRY_CORRECT,
          },
        });
      }
    }

    // Fetch explanation and correct option for immediate learning
    const questionData = await this.prisma.client.question.findUnique({
      where: { id: dto.questionId },
      include: {
        options: true,
        explanation: true,
      },
    });

    // Update user activity and streak
    await this.recordActivity(userId);

    return {
      success: true,
      isCorrect,
      selectedOptionId: dto.selectedOptionId,
      answer: updatedAnswer,
      correctOptionId: questionData?.options.find((o) => o.isCorrect)?.id,
      explanation: questionData?.explanation,
    };
  }

  /**
   * Finalize and score practice session authoritatively
   */
  async completeSession(userId: string, sessionId: string) {
    const session = await this.prisma.client.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Practice session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this practice session');
    }

    if (session.isCompleted) {
      // Already finalized; return state
      return this.getSession(userId, sessionId);
    }

    let grossMarks = 0;
    let negativeMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let totalTimeSpentSeconds = 0;

    for (const ans of session.answers) {
      totalTimeSpentSeconds += ans.timeSpentSeconds;

      if (!ans.selectedOptionId) {
        unattemptedCount++;
        continue;
      }

      if (ans.isCorrect) {
        correctCount++;
        grossMarks += Number(ans.question.marks);
      } else {
        incorrectCount++;
        if (session.enableNegativeMarking) {
          negativeMarks += Number(ans.question.negativeMarks);
        }
      }
    }

    const netScore = Math.max(0, grossMarks - negativeMarks);
    const attemptedCount = correctCount + incorrectCount;
    const accuracyPercent = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

    await this.prisma.client.practiceSession.update({
      where: { id: sessionId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        score: netScore,
        negativeMarks,
        correctCount,
        incorrectCount,
        unattemptedCount,
        totalTimeSpentSeconds,
      },
    });

    // Update user activity and streak
    await this.recordActivity(userId);

    return {
      ...(await this.getSession(userId, sessionId)),
      metrics: {
        totalQuestions: session.answers.length,
        attemptedCount,
        correctCount,
        incorrectCount,
        unattemptedCount,
        grossMarks,
        negativeMarks,
        netScore,
        accuracyPercent,
        totalTimeSpentSeconds,
      },
    };
  }

  /**
   * Submit an issue report for a question encountered during practice
   */
  async reportQuestion(userId: string, dto: CreateQuestionReportDto) {
    const question = await this.prisma.client.question.findUnique({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const report = await this.prisma.client.questionReport.create({
      data: {
        userId,
        questionId: dto.questionId,
        reason: dto.reason,
        details: dto.details || null,
      },
    });

    return {
      message: 'Question report submitted successfully. Our academic reviewers will verify it.',
      reportId: report.id,
      status: report.status,
    };
  }

  /**
   * Get user's practice history with pagination
   */
  async getHistory(userId: string, query: PracticeHistoryQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 10), 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.client.practiceSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          subject: { select: { id: true, name: true, slug: true } },
          chapter: { select: { id: true, name: true, slug: true } },
          topic: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.client.practiceSession.count({
        where: { userId },
      }),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        mode: s.mode,
        isCompleted: s.isCompleted,
        score: Number(s.score),
        correctCount: s.correctCount,
        incorrectCount: s.incorrectCount,
        unattemptedCount: s.unattemptedCount,
        questionCount: s.questionCount,
        totalTimeSpentSeconds: s.totalTimeSpentSeconds,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        subject: s.subject,
        chapter: s.chapter,
        topic: s.topic,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
