import { Injectable, Logger } from '@nestjs/common';
import { NotificationCategory } from '@cdsprep/types';

export interface NotificationJobData {
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(data: NotificationJobData): Promise<{ processed: boolean; deliveredAt: string }> {
    this.logger.log(
      `[Worker:Notification] Dispatching category=${data.category} notification to userId=${data.userId}: "${data.title}"`,
    );

    // In a live production environment, this integrates with APNS / FCM / In-App WebSocket dispatch.
    return {
      processed: true,
      deliveredAt: new Date().toISOString(),
    };
  }
}
