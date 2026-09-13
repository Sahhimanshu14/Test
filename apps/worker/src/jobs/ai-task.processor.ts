import { Injectable, Logger } from '@nestjs/common';

export interface AiBatchTaskJobData {
  taskId: string;
  taskType: 'EXPLANATION_PREWARM' | 'SIMILAR_QUESTIONS_INDEX' | 'STUDY_RECOMMENDATION_EMBED';
  payload: Record<string, any>;
}

@Injectable()
export class AiTaskProcessor {
  private readonly logger = new Logger(AiTaskProcessor.name);

  async process(data: AiBatchTaskJobData): Promise<{
    processed: boolean;
    taskId: string;
    completedAt: string;
  }> {
    this.logger.log(
      `[Worker:AiTask] Executing batch AI background pipeline task=${data.taskId} type=${data.taskType}`,
    );

    return {
      processed: true,
      taskId: data.taskId,
      completedAt: new Date().toISOString(),
    };
  }
}
