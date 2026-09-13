export enum CadetRankTier {
  CADET = 'CADET',
  LIEUTENANT = 'LIEUTENANT',
  CAPTAIN = 'CAPTAIN',
  MAJOR = 'MAJOR',
  COLONEL = 'COLONEL',
  BRIGADIER = 'BRIGADIER',
  GENERAL = 'GENERAL',
}

export enum BadgeId {
  FIRST_STEP = 'FIRST_STEP',
  SHARPSHOOTER = 'SHARPSHOOTER',
  CENTURION = 'CENTURION',
  WARRIOR_STREAK_7 = 'WARRIOR_STREAK_7',
  WARRIOR_STREAK_30 = 'WARRIOR_STREAK_30',
  MOCK_CHAMPION = 'MOCK_CHAMPION',
  OFFICER_GRADE = 'OFFICER_GRADE',
}

export enum NotificationCategory {
  TEST_RESULT = 'TEST_RESULT',
  DAILY_REMINDER = 'DAILY_REMINDER',
  STUDY_RECOMMENDATION = 'STUDY_RECOMMENDATION',
  WEEKLY_SUMMARY = 'WEEKLY_SUMMARY',
  NEW_CONTENT = 'NEW_CONTENT',
}

export enum LeaderboardPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ALL_TIME = 'ALL_TIME',
}

export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

export interface CadetGamificationProfile {
  totalXp: number;
  currentRank: CadetRankTier;
  nextRank: CadetRankTier | null;
  xpToNextRank: number;
  rankProgressPercent: number;
  currentStreak: number;
  highestStreak: number;
  earnedBadges: { id: BadgeId; earnedAt: string }[];
  dailyGoals: {
    questionsSolved: number;
    questionsTarget: number;
    testsCompleted: number;
    testsTarget: number;
    studyTimeMinutes: number;
    studyTimeTarget: number;
  };
}
