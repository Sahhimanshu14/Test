import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_PREFIX, CACHE_TTL } from '../common/cache/cache.service';
import { AcademyTarget, LeaderboardPeriod } from '@cdsprep/types';

@Injectable()
export class LeaderboardService {
  private readonly cacheService: CacheService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() cache?: CacheService,
  ) {
    this.cacheService = cache || new CacheService(new ConfigService());
  }

  async getRankings(period: string = 'WEEKLY', academy?: AcademyTarget) {
    const normalizedPeriod = period.toUpperCase();
    const cacheKey = `${CACHE_PREFIX.LEADERBOARD}:${normalizedPeriod}:${academy || 'ALL'}`;

    return this.cacheService.wrap(
      cacheKey,
      async () => this.fetchRankingsFromDb(normalizedPeriod, academy),
      CACHE_TTL.LEADERBOARD,
    );
  }

  private async fetchRankingsFromDb(normalizedPeriod: string, academy?: AcademyTarget) {
    const now = new Date();
    let startDate: Date | undefined;

    if (normalizedPeriod === 'WEEKLY') {
      startDate = new Date();
      startDate.setUTCDate(now.getUTCDate() - 7);
      startDate.setUTCHours(0, 0, 0, 0);
    } else if (normalizedPeriod === 'MONTHLY') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }

    // Try finding cached leaderboard table first
    const latestBoard = await this.prisma.client.leaderboard.findFirst({
      where: { period: normalizedPeriod },
      orderBy: { startDate: 'desc' },
      include: {
        entries: {
          orderBy: { rank: 'asc' },
          take: 50,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                targetAcademy: true,
                avatarUrl: true,
                preferences: true,
              },
            },
          },
        },
      },
    });

    if (latestBoard && latestBoard.entries.length > 0) {
      let entries = latestBoard.entries;
      if (academy) {
        entries = entries.filter(e => e.user.targetAcademy === academy);
      }

      return {
        period: normalizedPeriod,
        startDate: latestBoard.startDate,
        endDate: latestBoard.endDate,
        entries: entries.map((e, index) => this.maskPrivacy(e.user, index + 1, Number(e.totalScore), Number(e.accuracy), e.testsCompleted)),
      };
    }

    // Dynamic aggregation from actual attempt results
    const whereAttempt: Record<string, unknown> = {};
    if (startDate) {
      whereAttempt.submittedAt = { gte: startDate };
    }
    if (academy) {
      whereAttempt.user = { targetAcademy: academy };
    }

    const topResults = await this.prisma.client.result.findMany({
      where: {
        attempt: whereAttempt,
      },
      take: 50,
      orderBy: { netScore: 'desc' },
      include: {
        attempt: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                targetAcademy: true,
                avatarUrl: true,
                preferences: true,
              },
            },
          },
        },
      },
    });

    return {
      period: normalizedPeriod,
      entries: topResults.map((r, index) =>
        this.maskPrivacy(
          r.attempt.user,
          index + 1,
          Number(r.netScore),
          Number(r.accuracyPercent),
          1,
        ),
      ),
    };
  }

  async updatePrivacy(userId: string, isAnonymous: boolean) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const existingPrefs = (user.preferences as Record<string, any>) || {};
    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...existingPrefs,
          isAnonymous,
          leaderboardPrivacy: isAnonymous ? 'ANONYMOUS' : 'PUBLIC',
        },
      },
    });

    await this.cacheService.delPrefix(CACHE_PREFIX.LEADERBOARD);

    return { success: true, isAnonymous };
  }

  private maskPrivacy(
    user: { id: string; fullName: string; targetAcademy: string; avatarUrl?: string | null; preferences?: any },
    rank: number,
    totalScore: number,
    accuracy: number,
    testsCompleted = 1,
  ) {
    const prefs = (user.preferences as Record<string, any>) || {};
    const isAnonymous = prefs.isAnonymous === true || prefs.leaderboardPrivacy === 'ANONYMOUS';

    return {
      rank,
      totalScore,
      accuracy,
      testsCompleted,
      user: {
        id: isAnonymous ? 'anonymous' : user.id,
        fullName: isAnonymous ? `Cadet #${user.id.slice(0, 6).toUpperCase()}` : user.fullName,
        targetAcademy: user.targetAcademy,
        avatarUrl: isAnonymous ? null : user.avatarUrl,
        isAnonymous,
      },
    };
  }
}
