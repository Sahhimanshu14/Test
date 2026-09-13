import { ApiProperty } from '@nestjs/swagger';
import { CadetRankTier, BadgeId } from '@cdsprep/types';

export class EarnedBadgeItemDto {
  @ApiProperty({ enum: BadgeId })
  id!: BadgeId;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  icon!: string;

  @ApiProperty()
  earnedAt!: string;
}

export class CadetGamificationProfileDto {
  @ApiProperty()
  totalXp!: number;

  @ApiProperty({ enum: CadetRankTier })
  currentRank!: CadetRankTier;

  @ApiProperty({ enum: CadetRankTier, nullable: true })
  nextRank!: CadetRankTier | null;

  @ApiProperty()
  xpToNextRank!: number;

  @ApiProperty()
  rankProgressPercent!: number;

  @ApiProperty()
  currentStreak!: number;

  @ApiProperty()
  highestStreak!: number;

  @ApiProperty({ type: [EarnedBadgeItemDto] })
  earnedBadges!: EarnedBadgeItemDto[];

  @ApiProperty()
  dailyGoals!: {
    questionsSolved: number;
    questionsTarget: number;
    testsCompleted: number;
    testsTarget: number;
    studyTimeMinutes: number;
    studyTimeTarget: number;
  };
}
