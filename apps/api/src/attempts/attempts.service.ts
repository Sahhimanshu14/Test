import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_PREFIX, CACHE_TTL } from '../common/cache/cache.service';
import { AttemptStatus, QuestionPaletteState, MistakeStatus } from '@cdsprep/types';
import {
  AutosaveAnswerInput,
  SubmitAttemptInput,
  LogIntegrityEventInput,
} from '@cdsprep/validation';
import { randomUUID } from 'crypto';
import { calculateStreakUpdate } from '../common/utils/streak.util';

@Injectable()
export class AttemptsService {
  private readonly cacheService: CacheService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() cache?: CacheService,
  ) {
    this.cacheService = cache || new CacheService(new ConfigService());
  }

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
   * Start a new test attempt or resume an active in-progress attempt
   */
  async startAttempt(userId: string, testId: string, sessionToken?: string) {
    const cacheKey = `${CACHE_PREFIX.TESTS}:structure:${testId}`;
    const test = await this.cacheService.wrap(
      cacheKey,
      async () =>
        this.prisma.client.test.findUnique({
          where: { id: testId },
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                testQuestions: {
                  orderBy: { orderIndex: 'asc' },
                  include: {
                    question: {
                      include: {
                        options: {
                          orderBy: { orderIndex: 'asc' },
                          select: {
                            id: true,
                            identifier: true,
                            optionText: true,
                            // NEVER expose isCorrect to the client during attempt
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      CACHE_TTL.TEST_METADATA,
    );

    if (!test || !test.isPublished) {
      throw new NotFoundException('Test not found or not published');
    }

    // Check for an existing attempt by this user for this test
    const existingAttempt = await this.prisma.client.testAttempt.findFirst({
      where: {
        userId,
        testId,
        status: {
          in: [AttemptStatus.IN_PROGRESS, AttemptStatus.STARTED, AttemptStatus.CREATED],
        },
      },
      include: {
        answers: true,
        questionStates: true,
      },
    });

    if (existingAttempt) {
      // Check server deadline
      if (new Date() > existingAttempt.expiresAt) {
        // Auto-expire
        await this.prisma.client.testAttempt.update({
          where: { id: existingAttempt.id },
          data: { status: AttemptStatus.EXPIRED },
        });

        return {
          attempt: {
            ...existingAttempt,
            status: AttemptStatus.EXPIRED,
          },
          test,
          isResumed: true,
          isExpired: true,
          remainingSeconds: 0,
        };
      }

      const remainingSeconds = Math.max(
        0,
        Math.floor((existingAttempt.expiresAt.getTime() - Date.now()) / 1000),
      );

      // Multiple tab detection check
      const currentToken = sessionToken || randomUUID();
      if (existingAttempt.sessionToken && existingAttempt.sessionToken !== currentToken) {
        // Record multiple tab event
        await this.logIntegrityEventInternal(existingAttempt.id, {
          eventType: 'MULTIPLE_TAB_DETECTED' as any,
          timestamp: new Date().toISOString(),
          metadata: { previousToken: existingAttempt.sessionToken, newToken: currentToken },
        });
      }

      // Update session token and resume
      const updated = await this.prisma.client.testAttempt.update({
        where: { id: existingAttempt.id },
        data: { sessionToken: currentToken, status: AttemptStatus.IN_PROGRESS },
        include: {
          answers: true,
          questionStates: true,
        },
      });

      return {
        attempt: updated,
        test,
        isResumed: true,
        isExpired: false,
        remainingSeconds,
      };
    }

    // Authoritative server deadline: duration + 120s latency/network grace period
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + (test.durationMinutes * 60 + 120) * 1000);
    const initialSessionToken = sessionToken || randomUUID();

    const attempt = await this.prisma.client.testAttempt.create({
      data: {
        userId,
        testId,
        status: AttemptStatus.IN_PROGRESS,
        startedAt,
        expiresAt,
        sessionToken: initialSessionToken,
      },
      include: {
        answers: true,
        questionStates: true,
      },
    });

    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - startedAt.getTime()) / 1000));

    return {
      attempt,
      test,
      isResumed: false,
      isExpired: false,
      remainingSeconds,
    };
  }

  /**
   * Autosave candidate answer and update question palette state incrementally
   */
  async autosave(userId: string, attemptId: string, dto: AutosaveAnswerInput) {
    const attempt = await this.prisma.client.testAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Test attempt not found');
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException('You do not have access to this attempt');
    }
    if (
      attempt.status !== AttemptStatus.IN_PROGRESS &&
      attempt.status !== AttemptStatus.STARTED
    ) {
      throw new BadRequestException('Cannot save responses for a submitted or closed attempt');
    }

    // Authoritative server timer check
    if (new Date() > attempt.expiresAt) {
      await this.prisma.client.testAttempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.EXPIRED },
      });
      throw new BadRequestException('Test attempt timer has expired');
    }

    // Run answer upsert and question palette state upsert in parallel for reduced latency
    const [answer] = await Promise.all([
      this.prisma.client.attemptAnswer.upsert({
        where: {
          testAttemptId_questionId: {
            testAttemptId: attemptId,
            questionId: dto.questionId,
          },
        },
        update: {
          selectedOptionId: dto.selectedOptionId || null,
          timeSpentSeconds: { increment: dto.timeSpentSeconds || 0 },
        },
        create: {
          testAttemptId: attemptId,
          questionId: dto.questionId,
          selectedOptionId: dto.selectedOptionId || null,
          timeSpentSeconds: dto.timeSpentSeconds || 0,
        },
      }),
      this.prisma.client.attemptQuestionState.upsert({
        where: {
          testAttemptId_questionId: {
            testAttemptId: attemptId,
            questionId: dto.questionId,
          },
        },
        update: {
          state: dto.paletteState,
        },
        create: {
          testAttemptId: attemptId,
          questionId: dto.questionId,
          state: dto.paletteState,
        },
      }),
    ]);

    return answer;
  }

  /**
   * Finalize and submit examination attempt with idempotent safety
   */
  async submit(userId: string, attemptId: string, dto: SubmitAttemptInput) {
    const attempt = await this.prisma.client.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            sections: {
              include: {
                testQuestions: {
                  include: {
                    question: {
                      include: {
                        options: true,
                        subject: true,
                        topic: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        answers: true,
        result: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException('Unauthorized attempt submission');
    }

    // Idempotency: Return existing result if already submitted or expired
    if (
      attempt.status === AttemptStatus.SUBMITTED ||
      attempt.status === AttemptStatus.EXPIRED ||
      attempt.status === AttemptStatus.AUTO_SUBMITTED_TIMEOUT
    ) {
      return {
        message: 'Attempt already finalized',
        attemptId,
        isIdempotent: true,
        status: attempt.status,
        result: attempt.result,
      };
    }

    if (attempt.status === AttemptStatus.CANCELLED) {
      throw new BadRequestException('Cannot submit a cancelled attempt');
    }

    // Calculate marks authoritatively on server
    let totalQuestions = 0;
    let attemptedCount = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    let grossMarks = 0;
    let negativeMarks = 0;

    const answerMap = new Map<string, string | null>();
    for (const ans of attempt.answers) {
      answerMap.set(ans.questionId, ans.selectedOptionId);
    }

    const incorrectQuestionIds: string[] = [];

    // Track subject & topic breakdowns
    const subjectMap = new Map<string, { total: number; correct: number; incorrect: number; net: number }>();
    const topicMap = new Map<string, { total: number; correct: number; incorrect: number }>();

    for (const sec of attempt.test.sections) {
      for (const tq of sec.testQuestions) {
        totalQuestions++;
        const subName = tq.question.subject?.name || 'General';
        if (!subjectMap.has(subName)) {
          subjectMap.set(subName, { total: 0, correct: 0, incorrect: 0, net: 0 });
        }
        const subStat = subjectMap.get(subName)!;
        subStat.total++;

        const topName = tq.question.topic?.name || 'General Topic';
        if (!topicMap.has(topName)) {
          topicMap.set(topName, { total: 0, correct: 0, incorrect: 0 });
        }
        const topStat = topicMap.get(topName)!;
        topStat.total++;

        const selectedOptId = answerMap.get(tq.question.id);

        if (!selectedOptId) {
          skippedCount++;
          continue;
        }

        attemptedCount++;
        const correctOpt = tq.question.options.find((o) => o.isCorrect);

        if (correctOpt && correctOpt.id === selectedOptId) {
          correctCount++;
          const qMarks = Number(tq.question.marks);
          grossMarks += qMarks;
          subStat.correct++;
          subStat.net += qMarks;
          topStat.correct++;
        } else {
          incorrectCount++;
          const qNeg = Number(tq.question.negativeMarks);
          negativeMarks += qNeg;
          incorrectQuestionIds.push(tq.question.id);
          subStat.incorrect++;
          subStat.net = Math.max(0, subStat.net - qNeg);
          topStat.incorrect++;
        }
      }
    }

    const netScore = Math.max(0, grossMarks - negativeMarks);
    const accuracyPercent = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
    const isTimeout = new Date() > attempt.expiresAt;
    const finalStatus = isTimeout ? AttemptStatus.EXPIRED : AttemptStatus.SUBMITTED;

    // Transactional status update and result creation with breakdowns
    let result: any;
    try {
      const [, createdResult] = await this.prisma.client.$transaction([
        this.prisma.client.testAttempt.update({
          where: { id: attemptId },
          data: {
            status: finalStatus,
            submittedAt: new Date(),
            timeSpentSeconds: dto.timeSpentSeconds,
            antiCheatEvents: dto.antiCheatEvents
              ? (dto.antiCheatEvents as any)
              : attempt.antiCheatEvents,
          },
        }),
        this.prisma.client.result.create({
          data: {
            testAttemptId: attemptId,
            totalQuestions,
            attemptedCount,
            correctCount,
            incorrectCount,
            skippedCount,
            grossMarks,
            negativeMarks,
            netScore,
            accuracyPercent,
            subjectBreakdown: {
              create: Array.from(subjectMap.entries()).map(([subName, stat]) => ({
                subjectName: subName,
                totalQuestions: stat.total,
                correctCount: stat.correct,
                incorrectCount: stat.incorrect,
                netScore: Math.max(0, stat.net),
                accuracyPercent:
                  stat.correct + stat.incorrect > 0
                    ? (stat.correct / (stat.correct + stat.incorrect)) * 100
                    : 0,
              })),
            },
            topicBreakdown: {
              create: Array.from(topicMap.entries()).map(([topName, stat]) => ({
                topicName: topName,
                totalQuestions: stat.total,
                correctCount: stat.correct,
                incorrectCount: stat.incorrect,
                accuracyPercent:
                  stat.correct + stat.incorrect > 0
                    ? (stat.correct / (stat.correct + stat.incorrect)) * 100
                    : 0,
              })),
            },
          },
        }),
      ]);
      result = createdResult;
    } catch (err: any) {
      // Graceful idempotency if a concurrent submission already finalized this attempt
      if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
        const finalized = await this.prisma.client.testAttempt.findUnique({
          where: { id: attemptId },
          include: { result: true },
        });
        return {
          message: 'Attempt already finalized',
          attemptId,
          isIdempotent: true,
          status: finalized?.status || AttemptStatus.SUBMITTED,
          result: finalized?.result,
        };
      }
      throw err;
    }

    // Automatically populate Mistake Notebook for incorrect questions concurrently
    if (incorrectQuestionIds.length > 0) {
      await Promise.allSettled(
        incorrectQuestionIds.map((qId) =>
          this.prisma.client.mistake.upsert({
            where: {
              userId_questionId: {
                userId,
                questionId: qId,
              },
            },
            update: {
              status: MistakeStatus.ACTIVE,
              failedCount: { increment: 1 },
              lastMistakeAt: new Date(),
            },
            create: {
              userId,
              questionId: qId,
              status: MistakeStatus.ACTIVE,
              failedCount: 1,
              lastMistakeAt: new Date(),
            },
          }),
        ),
      );
    }

    // Update user activity and streak
    await this.recordActivity(userId);

    return {
      message: 'Test submitted and evaluated successfully',
      attemptId,
      status: finalStatus,
      netScore,
      accuracyPercent,
      correctCount,
      incorrectCount,
      skippedCount,
      result,
    };
  }

  /**
   * Log student behavioral integrity event (anti-tampering telemetry)
   */
  async logIntegrityEvent(userId: string, attemptId: string, dto: LogIntegrityEventInput) {
    const attempt = await this.prisma.client.testAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Test attempt not found');
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException('You do not have access to this attempt');
    }
    if (
      attempt.status !== AttemptStatus.IN_PROGRESS &&
      attempt.status !== AttemptStatus.STARTED
    ) {
      throw new BadRequestException('Cannot log events for a finalized attempt');
    }

    return this.logIntegrityEventInternal(attemptId, dto);
  }

  private async logIntegrityEventInternal(attemptId: string, dto: LogIntegrityEventInput) {
    const attempt = await this.prisma.client.testAttempt.findUnique({
      where: { id: attemptId },
      select: { antiCheatEvents: true },
    });

    const currentEvents = Array.isArray(attempt?.antiCheatEvents)
      ? (attempt.antiCheatEvents as any[])
      : [];

    const newEvent = {
      eventType: dto.eventType,
      timestamp: dto.timestamp || new Date().toISOString(),
      metadata: dto.metadata || null,
    };

    currentEvents.push(newEvent);

    await this.prisma.client.testAttempt.update({
      where: { id: attemptId },
      data: { antiCheatEvents: currentEvents },
    });

    return {
      success: true,
      eventCount: currentEvents.length,
      loggedEvent: newEvent,
    };
  }

  /**
   * Cancel / abandon attempt
   */
  async cancelAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.client.testAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Test attempt not found');
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException('Unauthorized attempt cancellation');
    }
    if (
      attempt.status === AttemptStatus.SUBMITTED ||
      attempt.status === AttemptStatus.EXPIRED
    ) {
      throw new BadRequestException('Cannot cancel a finalized attempt');
    }

    const updated = await this.prisma.client.testAttempt.update({
      where: { id: attemptId },
      data: { status: AttemptStatus.CANCELLED },
    });

    return {
      success: true,
      message: 'Attempt cancelled successfully',
      attempt: updated,
    };
  }

  /**
   * Retrieve live attempt status and remaining timer
   */
  async getAttemptStatus(userId: string, attemptId: string) {
    const attempt = await this.prisma.client.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        questionStates: true,
        answers: true,
        result: true,
        test: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            totalMarks: true,
          },
        },
      },
    });

    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt not found');
    }

    const isExpired = new Date() > attempt.expiresAt;
    const remainingSeconds = isExpired
      ? 0
      : Math.max(0, Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000));

    return {
      ...attempt,
      isExpired,
      remainingSeconds,
    };
  }
}
