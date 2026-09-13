import { Injectable, Logger } from '@nestjs/common';

export interface AnalyticsAggregationJobData {
  userId: string;
  triggerEvent: 'DRILL_SUBMITTED' | 'MOCK_SUBMITTED' | 'DAILY_ROLLUP';
  timestamp: string;
}

@Injectable()
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  async process(data: AnalyticsAggregationJobData): Promise<{
    processed: boolean;
    userId: string;
    computedAt: string;
  }> {
    this.logger.log(
      `[Worker:Analytics] Computing off-request analytics rollup for user=${data.userId}, event=${data.triggerEvent}`,
    );

    return {
      processed: true,
      userId: data.userId,
      computedAt: new Date().toISOString(),
    };
  }
}
