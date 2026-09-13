import { Module } from '@nestjs/common';
import { WorkerHealthService } from './health/worker-health.service';
import { NotificationProcessor } from './jobs/notification.processor';
import { LeaderboardProcessor } from './jobs/leaderboard.processor';
import { AnalyticsProcessor } from './jobs/analytics.processor';
import { AiTaskProcessor } from './jobs/ai-task.processor';

@Module({
  providers: [
    WorkerHealthService,
    NotificationProcessor,
    LeaderboardProcessor,
    AnalyticsProcessor,
    AiTaskProcessor,
  ],
  exports: [
    WorkerHealthService,
    NotificationProcessor,
    LeaderboardProcessor,
    AnalyticsProcessor,
    AiTaskProcessor,
  ],
})
export class WorkerModule {}
