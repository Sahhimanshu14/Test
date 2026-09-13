import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GamificationService } from '../src/gamification/gamification.service';
import { CadetRankTier, BadgeId } from '@cdsprep/types';

describe('Gamification Subsystem', () => {
  let gamificationService: GamificationService;
  let mockPrisma: any;

  const mockUser = {
    id: 'cadet-01',
    name: 'Vikram Batra',
    email: 'vikram@army.mil',
    currentStreak: 8,
    preferences: {
      gamification: {
        totalXp: 1450,
        earnedBadges: [],
      },
    },
  };

  beforeEach(() => {
    mockPrisma = {
      client: {
        user: {
          findUnique: vi.fn().mockResolvedValue(mockUser),
          update: vi.fn().mockResolvedValue(mockUser),
        },
        practiceSession: {
          count: vi.fn().mockResolvedValue(5),
        },
        practiceAnswer: {
          count: vi.fn().mockResolvedValue(120),
        },
        testAttempt: {
          count: vi.fn().mockResolvedValue(2),
        },
        result: {
          findFirst: vi.fn().mockResolvedValue({ accuracyPercent: 82 }),
        },
      },
    };

    gamificationService = new GamificationService(mockPrisma);
  });

  describe('Military Rank Progression & Strict Tier Boundaries', () => {
    it('calculates CADET rank at 0 XP and 249 XP', () => {
      const rank0 = gamificationService.calculateRankTier(0);
      expect(rank0.tier).toBe(CadetRankTier.CADET);
      expect(rank0.minXp).toBe(0);
      expect(rank0.maxXp).toBe(250);
      expect(rank0.progressPercent).toBe(0);

      const rank249 = gamificationService.calculateRankTier(249);
      expect(rank249.tier).toBe(CadetRankTier.CADET);
      expect(rank249.progressPercent).toBe(100);
    });

    it('calculates LIEUTENANT rank at exact 250 XP boundary and 749 XP', () => {
      const rank250 = gamificationService.calculateRankTier(250);
      expect(rank250.tier).toBe(CadetRankTier.LIEUTENANT);
      expect(rank250.minXp).toBe(250);
      expect(rank250.maxXp).toBe(750);
      expect(rank250.progressPercent).toBe(0);

      const rank749 = gamificationService.calculateRankTier(749);
      expect(rank749.tier).toBe(CadetRankTier.LIEUTENANT);
    });

    it('calculates CAPTAIN rank for 750 - 1499 XP', () => {
      const rank750 = gamificationService.calculateRankTier(750);
      expect(rank750.tier).toBe(CadetRankTier.CAPTAIN);
      expect(rank750.minXp).toBe(750);
      expect(rank750.maxXp).toBe(1500);

      const rank1499 = gamificationService.calculateRankTier(1499);
      expect(rank1499.tier).toBe(CadetRankTier.CAPTAIN);
    });

    it('calculates MAJOR rank for 1500 - 2999 XP', () => {
      const rank1500 = gamificationService.calculateRankTier(1500);
      expect(rank1500.tier).toBe(CadetRankTier.MAJOR);
      expect(rank1500.minXp).toBe(1500);
      expect(rank1500.maxXp).toBe(3000);
    });

    it('calculates COLONEL rank for 3000 - 5999 XP', () => {
      const rank3000 = gamificationService.calculateRankTier(3000);
      expect(rank3000.tier).toBe(CadetRankTier.COLONEL);
    });

    it('calculates BRIGADIER rank for 6000 - 9999 XP', () => {
      const rank6000 = gamificationService.calculateRankTier(6000);
      expect(rank6000.tier).toBe(CadetRankTier.BRIGADIER);
    });

    it('calculates GENERAL rank for 10000+ XP', () => {
      const rank10000 = gamificationService.calculateRankTier(10000);
      expect(rank10000.tier).toBe(CadetRankTier.GENERAL);
      expect(rank10000.progressPercent).toBe(100);
      expect(rank10000.nextTier).toBeNull();
    });
  });

  describe('Server-Side XP Calculation (Anti-Tamper)', () => {
    describe('calculatePracticeAnswerXp', () => {
      it('returns 0 XP for incorrect answer', () => {
        expect(gamificationService.calculatePracticeAnswerXp(false)).toBe(0);
      });

      it('returns 10 base XP for medium correct answer', () => {
        expect(gamificationService.calculatePracticeAnswerXp(true, 'MEDIUM', 45)).toBe(10);
      });

      it('adds +5 XP bonus for HARD difficulty', () => {
        expect(gamificationService.calculatePracticeAnswerXp(true, 'HARD', 45)).toBe(15);
      });

      it('adds +2 speed discipline bonus when answered within 30s', () => {
        expect(gamificationService.calculatePracticeAnswerXp(true, 'MEDIUM', 20)).toBe(12);
        expect(gamificationService.calculatePracticeAnswerXp(true, 'HARD', 15)).toBe(17);
      });
    });

    describe('calculateDrillXp', () => {
      it('awards 210 XP on high accuracy drill completion', () => {
        const xp = gamificationService.calculateDrillXp({
          correctCount: 10,
          wrongCount: 2,
          unansweredCount: 0,
          totalQuestions: 12,
          timeSpentSec: 400,
        });

        expect(xp).toBe(150 + 40 + 20); // 210 XP
      });

      it('handles all-wrong zero accuracy drill', () => {
        const xp = gamificationService.calculateDrillXp({
          correctCount: 0,
          wrongCount: 10,
          unansweredCount: 0,
          totalQuestions: 10,
        });

        // 0 correct (0) + 0 accuracy bonus (0) + completion bonus (20)
        expect(xp).toBe(20);
      });
    });

    describe('calculateTestAttemptXp', () => {
      it('clamps negative scores to zero', () => {
        const xp = gamificationService.calculateTestAttemptXp(-10, 10);
        // base completion 50, scoreXp 0, accuracyBonus 0
        expect(xp).toBe(50);
      });

      it('awards accuracy bonus for >= 80% accuracy', () => {
        const xp = gamificationService.calculateTestAttemptXp(75, 85);
        // base completion 50 + (75*2 = 150) + accuracyBonus 25 = 225
        expect(xp).toBe(225);
      });
    });

    describe('calculateMockTestXp', () => {
      it('calculates mock test XP with strict high-score bonuses', () => {
        const xp = gamificationService.calculateMockTestXp({
          score: 85,
          totalMarks: 100,
          accuracy: 88,
          timeSpentSec: 7000,
        });

        expect(xp).toBe(170 + 100 + 50); // 320 XP
      });
    });
  });

  describe('Badge Evaluation & Idempotency (Anti-Double Awarding)', () => {
    it('awards FIRST_STEP, CENTURION, WARRIOR_STREAK_7, MOCK_CHAMPION, OFFICER_GRADE when eligibility criteria met', async () => {
      const awardResult = await gamificationService.evaluateAndAwardBadges('cadet-01');

      expect(awardResult.newBadges).toEqual(
        expect.arrayContaining([
          BadgeId.FIRST_STEP,
          BadgeId.CENTURION,
          BadgeId.WARRIOR_STREAK_7,
          BadgeId.MOCK_CHAMPION,
          BadgeId.OFFICER_GRADE,
        ]),
      );
      expect(mockPrisma.client.user.update).toHaveBeenCalled();
    });

    it('does NOT re-award badges the user already possesses', async () => {
      // User already earned FIRST_STEP and CENTURION
      mockPrisma.client.user.findUnique.mockResolvedValue({
        ...mockUser,
        preferences: {
          gamification: {
            totalXp: 1450,
            earnedBadges: [
              { id: BadgeId.FIRST_STEP, earnedAt: new Date().toISOString() },
              { id: BadgeId.CENTURION, earnedAt: new Date().toISOString() },
            ],
          },
        },
      });

      const awardResult = await gamificationService.evaluateAndAwardBadges('cadet-01');

      expect(awardResult.newBadges).not.toContain(BadgeId.FIRST_STEP);
      expect(awardResult.newBadges).not.toContain(BadgeId.CENTURION);
      expect(awardResult.newBadges).toContain(BadgeId.WARRIOR_STREAK_7);
    });
  });
});
