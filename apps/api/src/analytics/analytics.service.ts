import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateActiveStreak } from '../common/utils/streak.util';

export interface SubjectMetric {
  subjectName: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  attemptedCount: number;
  skippedCount: number;
  netScore: number;
  accuracy: number;
}

export interface TopicMetric {
  topicName: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  weaknessIndicator: 'CRITICAL_WEAKNESS' | 'MODERATE' | 'STRONG';
}

export interface PerformanceTrendItem {
  attemptNumber: number;
  resultId: string;
  date: string;
  testTitle: string;
  testType: string;
  netScore: number;
  totalMarks: number;
  accuracyPercent: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  totalQuestions: number;
  cumulativeQuestionsSolved: number;
}

export interface TopicPacing {
  topicName: string;
  averageTimeSeconds: number;
  questionCount: number;
}

export interface TimeAnalyticsResult {
  hasData: boolean;
  averageTimePerQuestionSeconds: number;
  totalTimeSpentSeconds: number;
  totalTimedQuestions: number;
  slowTopics: TopicPacing[];
  fastTopics: TopicPacing[];
  timeDistribution: {
    under30s: number;
    from30to60s: number;
    from60to120s: number;
    over120s: number;
  };
}

export interface StudyPlanTask {
  id: string;
  type: 'MISTAKE_DRILL' | 'WEAK_TOPIC_PRACTICE' | 'DAILY_QUESTIONS_TARGET' | 'DAILY_MOCK_TARGET' | 'SECTIONAL_DRILL';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  priority: number;
  isCompleted: boolean;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Student Dashboard Summary & Integrated Workflow Data
   */
  async getStudentDashboardSummary(userId: string) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      user,
      results,
      mistakesCount,
      bookmarksCount,
      recentTestResults,
      activePracticeSession,
      topicBreakdowns,
      attemptsTodayCount,
      practiceAnswersTodayCount,
      attemptAnswersTodayCount,
      allAttemptsTime,
      allPracticeTime,
    ] = await Promise.all([
      this.prisma.client.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          targetAcademy: true,
          currentStreak: true,
          highestStreak: true,
          lastActiveDate: true,
          preferences: true,
        },
      }),
      this.prisma.client.result.findMany({
        where: { attempt: { userId } },
        select: {
          netScore: true,
          accuracyPercent: true,
          correctCount: true,
          incorrectCount: true,
          attemptedCount: true,
          skippedCount: true,
          totalQuestions: true,
        },
      }),
      this.prisma.client.mistake.count({
        where: { userId, status: 'ACTIVE' },
      }),
      this.prisma.client.bookmark.count({
        where: { userId },
      }),
      this.prisma.client.result.findMany({
        where: { attempt: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          attempt: {
            select: {
              id: true,
              startedAt: true,
              submittedAt: true,
              test: {
                select: {
                  id: true,
                  title: true,
                  totalMarks: true,
                  testType: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.client.practiceSession.findFirst({
        where: { userId, isCompleted: false },
        orderBy: { startedAt: 'desc' },
        include: {
          subject: { select: { name: true } },
          topic: { select: { name: true } },
        },
      }),
      this.prisma.client.resultTopic.findMany({
        where: { result: { attempt: { userId } } },
      }),
      this.prisma.client.testAttempt.count({
        where: {
          userId,
          status: { in: ['SUBMITTED', 'EXPIRED', 'AUTO_SUBMITTED_TIMEOUT'] },
          submittedAt: { gte: todayStart },
        },
      }),
      this.prisma.client.practiceAnswer.count({
        where: {
          session: { userId },
          answeredAt: { gte: todayStart },
        },
      }),
      this.prisma.client.attemptAnswer.count({
        where: {
          attempt: { userId },
          createdAt: { gte: todayStart },
          selectedOptionId: { not: null },
        },
      }),
      this.prisma.client.testAttempt.aggregate({
        where: { userId },
        _sum: { timeSpentSeconds: true },
      }),
      this.prisma.client.practiceSession.aggregate({
        where: { userId },
        _sum: { totalTimeSpentSeconds: true },
      }),
    ]);

    const testsCompleted = results.length;
    const hasData = testsCompleted > 0;

    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalSkipped = 0;
    let totalQuestions = 0;
    let accuracySum = 0;
    let netScoreSum = 0;

    for (const r of results) {
      totalQuestionsAttempted += r.attemptedCount;
      totalCorrect += r.correctCount;
      totalIncorrect += r.incorrectCount;
      totalSkipped += r.skippedCount;
      totalQuestions += r.totalQuestions;
      accuracySum += Number(r.accuracyPercent);
      netScoreSum += Number(r.netScore);
    }

    const averageAccuracy =
      testsCompleted > 0 ? Math.round((accuracySum / testsCompleted) * 10) / 10 : 0;
    const averageScore =
      testsCompleted > 0 ? Math.round((netScoreSum / testsCompleted) * 10) / 10 : 0;

    // Authoritative streak evaluation
    const streakStatus = user?.lastActiveDate
      ? evaluateActiveStreak(user.currentStreak, user.lastActiveDate)
      : { currentStreak: user?.currentStreak || 0, isActiveToday: false, isStreakBroken: false };

    // Readiness score heuristic (0 to 100 based on consistency, tests completed, accuracy)
    const consistencyFactor = Math.min(30, (streakStatus.currentStreak || 0) * 3);
    const testsFactor = Math.min(30, testsCompleted * 6);
    const accuracyFactor = Math.min(40, (averageAccuracy / 100) * 40);
    const readinessScore = hasData ? Math.round(consistencyFactor + testsFactor + accuracyFactor) : 0;

    // Study time calculation
    const totalExamSeconds = allAttemptsTime._sum.timeSpentSeconds || 0;
    const totalPracticeSeconds = allPracticeTime._sum.totalTimeSpentSeconds || 0;
    const totalStudyTimeMinutes = Math.round((totalExamSeconds + totalPracticeSeconds) / 60);

    // Weak topics aggregation
    const topicMap = new Map<string, { total: number; correct: number; incorrect: number }>();
    for (const tb of topicBreakdowns) {
      const existing = topicMap.get(tb.topicName) || { total: 0, correct: 0, incorrect: 0 };
      existing.total += tb.totalQuestions;
      existing.correct += tb.correctCount;
      existing.incorrect += tb.incorrectCount;
      topicMap.set(tb.topicName, existing);
    }

    const weakTopics: TopicMetric[] = Array.from(topicMap.entries())
      .map(([topicName, stat]) => {
        const attempted = stat.correct + stat.incorrect;
        const accuracy = attempted > 0 ? Math.round((stat.correct / attempted) * 1000) / 10 : 0;
        let weaknessIndicator: 'CRITICAL_WEAKNESS' | 'MODERATE' | 'STRONG' = 'STRONG';
        if (accuracy < 50) weaknessIndicator = 'CRITICAL_WEAKNESS';
        else if (accuracy < 70) weaknessIndicator = 'MODERATE';
        return {
          topicName,
          totalQuestions: stat.total,
          attemptedCount: attempted,
          correctCount: stat.correct,
          incorrectCount: stat.incorrect,
          accuracy,
          weaknessIndicator,
        };
      })
      .filter((t) => t.attemptedCount > 0 && t.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    // Recent tests formatting
    const recentTests = recentTestResults.map((r) => ({
      id: r.attempt?.id || r.id,
      resultId: r.id,
      testTitle: r.attempt?.test?.title || 'Mock Examination',
      testType: r.attempt?.test?.testType || 'FULL_MOCK',
      score: Number(r.netScore),
      totalMarks: Number(r.attempt?.test?.totalMarks || 100),
      accuracy: Number(r.accuracyPercent),
      date: r.createdAt?.toISOString ? r.createdAt.toISOString() : new Date().toISOString(),
    }));

    // Daily Goals calculation
    const questionsToday = practiceAnswersTodayCount + attemptAnswersTodayCount;
    const testsToday = attemptsTodayCount;
    const studyTimeTodayMinutes = Math.round((questionsToday * 60) / 60); // Heuristic ~1m per q

    const dailyGoals = {
      questions: {
        current: questionsToday,
        target: 30,
        completed: questionsToday >= 30,
      },
      tests: {
        current: testsToday,
        target: 1,
        completed: testsToday >= 1,
      },
      studyTime: {
        currentMinutes: studyTimeTodayMinutes,
        targetMinutes: 45,
        completed: studyTimeTodayMinutes >= 45,
      },
    };

    // Deterministic Study Plan recommendations
    const studyPlan: StudyPlanTask[] = [];

    if (mistakesCount > 0) {
      studyPlan.push({
        id: 'task-mistakes',
        type: 'MISTAKE_DRILL',
        title: 'Mistake Notebook Revision',
        description: `Resolve ${mistakesCount} recorded question errors from previous practice and mock tests.`,
        actionLabel: 'Review Mistakes',
        actionUrl: '/mistakes',
        priority: 1,
        isCompleted: false,
      });
    }

    if (weakTopics.length > 0) {
      const primaryWeakTopic = weakTopics[0];
      studyPlan.push({
        id: `task-weak-topic-${primaryWeakTopic.topicName}`,
        type: 'WEAK_TOPIC_PRACTICE',
        title: `Targeted Drill: ${primaryWeakTopic.topicName}`,
        description: `Current accuracy is ${primaryWeakTopic.accuracy}%. Solve 10 focused questions to eliminate penalty points.`,
        actionLabel: 'Practice Topic',
        actionUrl: `/practice?topic=${encodeURIComponent(primaryWeakTopic.topicName)}`,
        priority: 2,
        isCompleted: false,
      });
    }

    if (!dailyGoals.questions.completed) {
      studyPlan.push({
        id: 'task-daily-questions',
        type: 'DAILY_QUESTIONS_TARGET',
        title: 'Daily Question Goal',
        description: `Solve ${Math.max(0, 30 - questionsToday)} more questions today to achieve your 30-question quota.`,
        actionLabel: 'Practice Hub',
        actionUrl: '/practice',
        priority: 3,
        isCompleted: false,
      });
    }

    if (!dailyGoals.tests.completed) {
      studyPlan.push({
        id: 'task-daily-mock',
        type: 'DAILY_MOCK_TARGET',
        title: 'Daily Examination Simulation',
        description: 'Take 1 Full Mock or Subject Test to maintain exam-day timing and stamina.',
        actionLabel: 'Take Mock Test',
        actionUrl: '/tests',
        priority: 4,
        isCompleted: false,
      });
    }

    // Continue Practice session if active
    const continuePractice = activePracticeSession
      ? {
          sessionId: activePracticeSession.id,
          mode: activePracticeSession.mode,
          subjectName: activePracticeSession.subject?.name,
          topicName: activePracticeSession.topic?.name,
          questionCount: activePracticeSession.questionCount,
          startedAt: activePracticeSession.startedAt,
        }
      : null;

    return {
      hasData,
      user,
      streak: {
        currentStreak: streakStatus.currentStreak,
        highestStreak: user?.highestStreak || 0,
        isActiveToday: streakStatus.isActiveToday,
      },
      metrics: {
        testsCompleted,
        totalQuestionsAttempted,
        totalCorrect,
        totalIncorrect,
        totalSkipped,
        totalQuestions,
        averageAccuracy,
        averageScore,
        readinessScore,
        totalStudyTimeMinutes,
        activeMistakesCount: mistakesCount,
        bookmarksCount,
      },
      weakTopics,
      recentTests,
      continuePractice,
      dailyGoals,
      studyPlan,
    };
  }

  /**
   * 2. Subject Breakdown Analytics (English, GK, Mathematics)
   */
  async getSubjectAnalytics(userId: string): Promise<{ hasData: boolean; subjects: SubjectMetric[] }> {
    const subjectBreakdowns = await this.prisma.client.resultSubject.findMany({
      where: {
        result: {
          attempt: { userId },
        },
      },
    });

    if (subjectBreakdowns.length === 0) {
      return {
        hasData: false,
        subjects: [],
      };
    }

    const subjectMap = new Map<
      string,
      {
        subjectName: string;
        totalQuestions: number;
        correctCount: number;
        incorrectCount: number;
        attemptedCount: number;
        skippedCount: number;
        netScore: number;
      }
    >();

    for (const sb of subjectBreakdowns) {
      const existing = subjectMap.get(sb.subjectName) || {
        subjectName: sb.subjectName,
        totalQuestions: 0,
        correctCount: 0,
        incorrectCount: 0,
        attemptedCount: 0,
        skippedCount: 0,
        netScore: 0,
      };

      const attempted = sb.correctCount + sb.incorrectCount;
      const skipped = Math.max(0, sb.totalQuestions - attempted);

      existing.totalQuestions += sb.totalQuestions;
      existing.correctCount += sb.correctCount;
      existing.incorrectCount += sb.incorrectCount;
      existing.attemptedCount += attempted;
      existing.skippedCount += skipped;
      existing.netScore += Number(sb.netScore);

      subjectMap.set(sb.subjectName, existing);
    }

    const subjects: SubjectMetric[] = Array.from(subjectMap.values()).map((s) => {
      const accuracy =
        s.attemptedCount > 0
          ? Math.round((s.correctCount / s.attemptedCount) * 1000) / 10
          : 0;
      return {
        ...s,
        accuracy,
        netScore: Math.round(s.netScore * 10) / 10,
      };
    });

    return {
      hasData: true,
      subjects,
    };
  }

  /**
   * 3. Topic Analytics & Weakness Identification
   */
  async getTopicAnalytics(userId: string): Promise<{ hasData: boolean; topics: TopicMetric[] }> {
    const topicBreakdowns = await this.prisma.client.resultTopic.findMany({
      where: {
        result: {
          attempt: { userId },
        },
      },
    });

    if (topicBreakdowns.length === 0) {
      return {
        hasData: false,
        topics: [],
      };
    }

    const topicMap = new Map<
      string,
      {
        topicName: string;
        totalQuestions: number;
        correctCount: number;
        incorrectCount: number;
        attemptedCount: number;
      }
    >();

    for (const tb of topicBreakdowns) {
      const existing = topicMap.get(tb.topicName) || {
        topicName: tb.topicName,
        totalQuestions: 0,
        correctCount: 0,
        incorrectCount: 0,
        attemptedCount: 0,
      };

      existing.totalQuestions += tb.totalQuestions;
      existing.correctCount += tb.correctCount;
      existing.incorrectCount += tb.incorrectCount;
      existing.attemptedCount += tb.correctCount + tb.incorrectCount;

      topicMap.set(tb.topicName, existing);
    }

    const topics: TopicMetric[] = Array.from(topicMap.values()).map((t) => {
      const accuracy =
        t.attemptedCount > 0
          ? Math.round((t.correctCount / t.attemptedCount) * 1000) / 10
          : 0;

      let weaknessIndicator: 'CRITICAL_WEAKNESS' | 'MODERATE' | 'STRONG';
      if (accuracy < 50) {
        weaknessIndicator = 'CRITICAL_WEAKNESS';
      } else if (accuracy < 70) {
        weaknessIndicator = 'MODERATE';
      } else {
        weaknessIndicator = 'STRONG';
      }

      return {
        topicName: t.topicName,
        totalQuestions: t.totalQuestions,
        attemptedCount: t.attemptedCount,
        correctCount: t.correctCount,
        incorrectCount: t.incorrectCount,
        accuracy,
        weaknessIndicator,
      };
    });

    // Sort by weakest first (lowest accuracy, then highest incorrect count)
    topics.sort((a, b) => a.accuracy - b.accuracy || b.incorrectCount - a.incorrectCount);

    return {
      hasData: true,
      topics,
    };
  }

  /**
   * 4. Performance Trends Over Time
   */
  async getPerformanceTrends(userId: string): Promise<{ hasData: boolean; trends: PerformanceTrendItem[] }> {
    const results = await this.prisma.client.result.findMany({
      where: {
        attempt: { userId },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        attempt: {
          select: {
            startedAt: true,
            submittedAt: true,
            test: {
              select: {
                title: true,
                totalMarks: true,
                testType: true,
              },
            },
          },
        },
      },
    });

    if (results.length === 0) {
      return {
        hasData: false,
        trends: [],
      };
    }

    let cumulativeQuestionsSolved = 0;

    const trends: PerformanceTrendItem[] = results.map((r, index) => {
      cumulativeQuestionsSolved += r.correctCount;
      return {
        attemptNumber: index + 1,
        resultId: r.id,
        date: r.createdAt.toISOString(),
        testTitle: r.attempt.test.title,
        testType: r.attempt.test.testType,
        netScore: Number(r.netScore),
        totalMarks: Number(r.attempt.test.totalMarks),
        accuracyPercent: Number(r.accuracyPercent),
        attemptedCount: r.attemptedCount,
        correctCount: r.correctCount,
        incorrectCount: r.incorrectCount,
        skippedCount: r.skippedCount,
        totalQuestions: r.totalQuestions,
        cumulativeQuestionsSolved,
      };
    });

    return {
      hasData: true,
      trends,
    };
  }

  /**
   * 5. Time Analysis & Pacing Distribution
   */
  async getTimeAnalytics(userId: string): Promise<TimeAnalyticsResult> {
    const answers = await this.prisma.client.attemptAnswer.findMany({
      where: {
        attempt: { userId, status: { in: ['SUBMITTED', 'EXPIRED', 'AUTO_SUBMITTED_TIMEOUT'] } },
        timeSpentSeconds: { gt: 0 },
      },
      include: {
        question: {
          select: {
            topic: {
              select: { name: true },
            },
            subject: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (answers.length === 0) {
      return {
        hasData: false,
        averageTimePerQuestionSeconds: 0,
        totalTimeSpentSeconds: 0,
        totalTimedQuestions: 0,
        slowTopics: [],
        fastTopics: [],
        timeDistribution: {
          under30s: 0,
          from30to60s: 0,
          from60to120s: 0,
          over120s: 0,
        },
      };
    }

    let totalTime = 0;
    const timeDistribution = {
      under30s: 0,
      from30to60s: 0,
      from60to120s: 0,
      over120s: 0,
    };

    const topicTimes = new Map<string, { totalTime: number; count: number }>();

    for (const ans of answers) {
      const t = ans.timeSpentSeconds;
      totalTime += t;

      if (t < 30) {
        timeDistribution.under30s++;
      } else if (t <= 60) {
        timeDistribution.from30to60s++;
      } else if (t <= 120) {
        timeDistribution.from60to120s++;
      } else {
        timeDistribution.over120s++;
      }

      const topicName = ans.question.topic?.name || 'General';
      const existing = topicTimes.get(topicName) || { totalTime: 0, count: 0 };
      existing.totalTime += t;
      existing.count++;
      topicTimes.set(topicName, existing);
    }

    const averageTimePerQuestionSeconds = Math.round((totalTime / answers.length) * 10) / 10;

    const topicPacing: TopicPacing[] = Array.from(topicTimes.entries()).map(([topicName, stat]) => ({
      topicName,
      averageTimeSeconds: Math.round((stat.totalTime / stat.count) * 10) / 10,
      questionCount: stat.count,
    }));

    // Sort descending for slow topics, ascending for fast topics
    const slowTopics = [...topicPacing]
      .sort((a, b) => b.averageTimeSeconds - a.averageTimeSeconds)
      .slice(0, 5);

    const fastTopics = [...topicPacing]
      .sort((a, b) => a.averageTimeSeconds - b.averageTimeSeconds)
      .slice(0, 5);

    return {
      hasData: true,
      averageTimePerQuestionSeconds,
      totalTimeSpentSeconds: totalTime,
      totalTimedQuestions: answers.length,
      slowTopics,
      fastTopics,
      timeDistribution,
    };
  }
}
