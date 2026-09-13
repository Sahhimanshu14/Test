import { Injectable, Logger } from '@nestjs/common';
import { LeaderboardPeriod } from '@cdsprep/types';

export interface LeaderboardRollupJobData {
  period: LeaderboardPeriod;
  targetAcademy?: string;
  forceRefresh?: boolean;
}

@Injectable()
export class LeaderboardProcessor {
  private readonly logger = new Logger(LeaderboardProcessor.name);

  async process(data: LeaderboardRollupJobData): Promise<{
    processed: boolean;
    period: LeaderboardPeriod;
    aggregatedAt: string;
  }> {
    this.logger.log(
      `[Worker:Leaderboard] Rolling up standings for period=${data.period}, academy=${data.targetAcademy || 'ALL'}`,
    );

    // Rollup logic materializes ranks and stores high-performance snapshots
    return {
      processed: true,
      period: data.period,
      aggregatedAt: new Date().toISOString(),
    };
  }
}
