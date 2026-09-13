import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CadetRankTier,
  BadgeId,
  BadgeDefinition,
} from '@cdsprep/types';
import {
  CadetGamificationProfileDto,
  EarnedBadgeItemDto,
} from './dto/gamification.dto';

export const BADGE_CATALOG: Record<BadgeId, BadgeDefinition> = {
  [BadgeId.FIRST_STEP]: {
    id: BadgeId.FIRST_STEP,
    title: 'First Step',
    description: 'Complete your first practice question session',
    icon: 'Footprints',
    xpReward: 50,
  },
  [BadgeId.SHARPSHOOTER]: {
    id: BadgeId.SHARPSHOOTER,
    title: 'Sharpshooter',
    description: 'Achieve 100% accuracy on a drill of 5 or more questions',
    icon: 'Crosshair',
    xpReward: 100,
  },
  [BadgeId.CENTURION]: {
    id: BadgeId.CENTURION,
    title: 'Centurion',
    description: 'Solve 100 verified questions in the practice arena',
    icon: 'Shield',
    xpReward: 200,
  },
  [BadgeId.WARRIOR_STREAK_7]: {
    id: BadgeId.WARRIOR_STREAK_7,
    title: 'Warrior Streak (7 Days)',
    description: 'Maintain an unbroken daily activity streak for 7 days',
    icon: 'Flame',
    xpReward: 150,
  },
  [BadgeId.WARRIOR_STREAK_30]: {
    id: BadgeId.WARRIOR_STREAK_30,
    title: 'Iron Discipline (30 Days)',
    description: 'Maintain an unbroken daily activity streak for 30 consecutive days',
    icon: 'Zap',
    xpReward: 500,
  },
  [BadgeId.MOCK_CHAMPION]: {
    id: BadgeId.MOCK_CHAMPION,
    title: 'Mock Champion',
    description: 'Complete your first full 120-minute mock examination',
    icon: 'Award',
    xpReward: 250,
  },
  [BadgeId.OFFICER_GRADE]: {
    id: BadgeId.OFFICER_GRADE,
    title: 'Officer Grade',
    description: 'Achieve a net score above 75% on an authentic CDS mock examination',
    icon: 'Crown',
    xpReward: 400,
  },
};

const RANK_THRESHOLDS: { rank: CadetRankTier; minXp: number; nextRank: CadetRankTier | null; maxXp: number }[] = [
  { rank: CadetRankTier.CADET, minXp: 0, maxXp: 250, nextRank: CadetRankTier.LIEUTENANT },
  { rank: CadetRankTier.LIEUTENANT, minXp: 250, maxXp: 750, nextRank: CadetRankTier.CAPTAIN },
  { rank: CadetRankTier.CAPTAIN, minXp: 750, maxXp: 1500, nextRank: CadetRankTier.MAJOR },
  { rank: CadetRankTier.MAJOR, minXp: 1500, maxXp: 3000, nextRank: CadetRankTier.COLONEL },
  { rank: CadetRankTier.COLONEL, minXp: 3000, maxXp: 6000, nextRank: CadetRankTier.BRIGADIER },
  { rank: CadetRankTier.BRIGADIER, minXp: 6000, maxXp: 10000, nextRank: CadetRankTier.GENERAL },
  { rank: CadetRankTier.GENERAL, minXp: 10000, maxXp: 100000, nextRank: null },
];

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  calculateRankTier(xp: number): {
    tier: CadetRankTier;
    minXp: number;
    maxXp: number;
    progressPercent: number;
    nextTier: CadetRankTier | null;
  } {
    for (const t of RANK_THRESHOLDS) {
      if (xp >= t.minXp && (t.maxXp === 100000 || xp < t.maxXp)) {
        let progressPercent = 100;
        if (t.nextRank) {
          const range = t.maxXp - t.minXp;
          const current = xp - t.minXp;
          progressPercent = Math.min(100, Math.max(0, Math.round((current / range) * 100)));
        }
        return {
          tier: t.rank,
          minXp: t.minXp,
          maxXp: t.maxXp === 100000 ? t.minXp : t.maxXp,
          progressPercent,
          nextTier: t.nextRank,
        };
      }
    }
    return {
      tier: CadetRankTier.GENERAL,
      minXp: 10000,
      maxXp: 10000,
      progressPercent: 100,
      nextTier: null,
    };
  }

  // ---------------------------------------------------------------------------
  // 1. SERVER-AUTHORITATIVE XP & BADGE EVALUATION
  // ---------------------------------------------------------------------------
  calculatePracticeAnswerXp(isCorrect: boolean, difficulty: string = 'MEDIUM', timeSpentSeconds = 30): number {
    if (!isCorrect) return 0;

    let xp = 10; // Base XP for correct answer
    if (difficulty === 'HARD') xp += 5;
    if (timeSpentSeconds > 0 && timeSpentSeconds <= 30) xp += 2; // Speed discipline bonus

    return xp;
  }

  calculateDrillXp(params: {
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    totalQuestions: number;
    timeSpentSec?: number;
  }): number {
    const basePerCorrect = 15;
    const correctXp = params.correctCount * basePerCorrect;
    const accuracy = params.totalQuestions > 0 ? (params.correctCount / params.totalQuestions) * 100 : 0;
    const accuracyBonus = accuracy >= 80 ? 40 : accuracy >= 60 ? 20 : 0;
    const completionBonus = 20;

    return correctXp + accuracyBonus + completionBonus;
  }

  calculateTestAttemptXp(netScore: number, accuracyPercent: number): number {
    const baseCompletion = 50;
    const scoreXp = Math.max(0, Math.round(netScore * 2));
    const accuracyBonus = accuracyPercent >= 80 ? 25 : 0;

    return baseCompletion + scoreXp + accuracyBonus;
  }

  calculateMockTestXp(params: {
    score: number;
    totalMarks: number;
    accuracy: number;
    timeSpentSec?: number;
  }): number {
    const scorePercent = params.totalMarks > 0 ? (params.score / params.totalMarks) * 100 : 0;
    const baseScoreXp = Math.round(params.score * 2);
    const scoreBonus = scorePercent >= 80 ? 100 : scorePercent >= 60 ? 50 : 0;
    const completionBonus = 50;

    return baseScoreXp + scoreBonus + completionBonus;
  }

  async evaluateAndAwardBadges(userId: string): Promise<{ newBadges: BadgeId[] }> {
    const res = await this.awardXpAndCheckBadges(userId, 0);
    return { newBadges: res.newlyUnlocked };
  }


  async awardXpAndCheckBadges(userId: string, addedXp: number): Promise<{ totalXp: number; newlyUnlocked: BadgeId[] }> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { preferences: true, currentStreak: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const prefs = (user.preferences as Record<string, any>) || {};
    const gamification = prefs.gamification || { totalXp: 0, earnedBadges: [] };

    const newTotalXp = (gamification.totalXp || 0) + addedXp;
    const existingBadgeIds: string[] = (gamification.earnedBadges || []).map((b: any) => b.id);
    const newlyUnlocked: BadgeId[] = [];

    // Check Badge Criteria against actual database activity
    const [practiceSessionsCount, questionsSolved, testAttemptsCount, highestMockResult] = await Promise.all([
      this.prisma.client.practiceSession.count({ where: { userId, isCompleted: true } }),
      this.prisma.client.practiceAnswer.count({ where: { session: { userId }, isCorrect: true } }),
      this.prisma.client.testAttempt.count({ where: { userId, status: 'SUBMITTED' } }),
      this.prisma.client.result.findFirst({
        where: { attempt: { userId } },
        orderBy: { accuracyPercent: 'desc' },
      }),
    ]);

    // Badge: FIRST_STEP
    if (!existingBadgeIds.includes(BadgeId.FIRST_STEP) && practiceSessionsCount >= 1) {
      newlyUnlocked.push(BadgeId.FIRST_STEP);
    }

    // Badge: CENTURION
    if (!existingBadgeIds.includes(BadgeId.CENTURION) && questionsSolved >= 100) {
      newlyUnlocked.push(BadgeId.CENTURION);
    }

    // Badge: WARRIOR_STREAK_7
    if (!existingBadgeIds.includes(BadgeId.WARRIOR_STREAK_7) && user.currentStreak >= 7) {
      newlyUnlocked.push(BadgeId.WARRIOR_STREAK_7);
    }

    // Badge: WARRIOR_STREAK_30
    if (!existingBadgeIds.includes(BadgeId.WARRIOR_STREAK_30) && user.currentStreak >= 30) {
      newlyUnlocked.push(BadgeId.WARRIOR_STREAK_30);
    }

    // Badge: MOCK_CHAMPION
    if (!existingBadgeIds.includes(BadgeId.MOCK_CHAMPION) && testAttemptsCount >= 1) {
      newlyUnlocked.push(BadgeId.MOCK_CHAMPION);
    }

    // Badge: OFFICER_GRADE
    if (!existingBadgeIds.includes(BadgeId.OFFICER_GRADE) && highestMockResult && Number(highestMockResult.accuracyPercent) >= 75) {
      newlyUnlocked.push(BadgeId.OFFICER_GRADE);
    }

    const updatedEarnedBadges = [
      ...(gamification.earnedBadges || []),
      ...newlyUnlocked.map(id => ({ id, earnedAt: new Date().toISOString() })),
    ];

    // Persist updated gamification record securely
    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...prefs,
          gamification: {
            totalXp: newTotalXp,
            earnedBadges: updatedEarnedBadges,
          },
        },
      },
    });

    return { totalXp: newTotalXp, newlyUnlocked };
  }

  // ---------------------------------------------------------------------------
  // 2. CADET GAMIFICATION PROFILE & RANK PROGRESSION
  // ---------------------------------------------------------------------------
  async getCadetProfile(userId: string): Promise<CadetGamificationProfileDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        preferences: true,
        currentStreak: true,
        highestStreak: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const prefs = (user.preferences as Record<string, any>) || {};
    const gamification = prefs.gamification || { totalXp: 0, earnedBadges: [] };
    const totalXp = Number(gamification.totalXp) || 0;

    // Calculate Rank
    let currentRankTier = CadetRankTier.CADET;
    let nextRankTier: CadetRankTier | null = CadetRankTier.LIEUTENANT;
    let xpToNext = 250 - totalXp;
    let rankProgress = Math.min(100, Math.round((totalXp / 250) * 100));

    for (const t of RANK_THRESHOLDS) {
      if (totalXp >= t.minXp && (t.maxXp === 100000 || totalXp < t.maxXp)) {
        currentRankTier = t.rank;
        nextRankTier = t.nextRank;
        if (t.nextRank) {
          const range = t.maxXp - t.minXp;
          const currentInRange = totalXp - t.minXp;
          xpToNext = t.maxXp - totalXp;
          rankProgress = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
        } else {
          xpToNext = 0;
          rankProgress = 100;
        }
        break;
      }
    }

    // Format Earned Badges
    const earnedBadgeItems: EarnedBadgeItemDto[] = (gamification.earnedBadges || []).map((b: any) => {
      const def = BADGE_CATALOG[b.id as BadgeId];
      return {
        id: b.id,
        title: def ? def.title : b.id,
        description: def ? def.description : '',
        icon: def ? def.icon : 'Award',
        earnedAt: b.earnedAt,
      };
    });

    // Compute Daily Goal Progress for Today (UTC)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [todayQuestions, todayTests] = await Promise.all([
      this.prisma.client.practiceAnswer.count({
        where: {
          session: { userId },
          answeredAt: { gte: startOfToday },
        },
      }),
      this.prisma.client.testAttempt.count({
        where: {
          userId,
          status: 'SUBMITTED',
          submittedAt: { gte: startOfToday },
        },
      }),
    ]);

    return {
      totalXp,
      currentRank: currentRankTier,
      nextRank: nextRankTier,
      xpToNextRank: Math.max(0, xpToNext),
      rankProgressPercent: rankProgress,
      currentStreak: user.currentStreak || 1,
      highestStreak: user.highestStreak || user.currentStreak || 1,
      earnedBadges: earnedBadgeItems,
      dailyGoals: {
        questionsSolved: todayQuestions,
        questionsTarget: 25,
        testsCompleted: todayTests,
        testsTarget: 1,
        studyTimeMinutes: Math.min(45, Math.round(todayQuestions * 1.5)),
        studyTimeTarget: 45,
      },
    };
  }

  getBadgeCatalog(): BadgeDefinition[] {
    return Object.values(BADGE_CATALOG);
  }
}
