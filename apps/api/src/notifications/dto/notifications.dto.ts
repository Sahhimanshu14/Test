import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory } from '@cdsprep/types';

export class NotificationFilterDto {
  @ApiPropertyOptional({ default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter only unread notifications' })
  unreadOnly?: boolean;
}

export class NotificationPreferencesDto {
  @ApiPropertyOptional({ default: true, description: 'Test and mock score publication notifications' })
  testResults?: boolean = true;

  @ApiPropertyOptional({ default: true, description: 'Daily streak and practice drill reminders' })
  dailyReminders?: boolean = true;

  @ApiPropertyOptional({ default: true, description: 'AI diagnostic weakness and study recommendations' })
  recommendations?: boolean = true;

  @ApiPropertyOptional({ default: true, description: 'Weekly performance digest and rank updates' })
  weeklySummary?: boolean = true;

  @ApiPropertyOptional({ default: true, description: 'New 20-Yr PYQ paper releases and question bank updates' })
  newContent?: boolean = true;
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  title!: string;

  @ApiProperty({ description: 'Notification detailed message' })
  message!: string;

  @ApiPropertyOptional({ description: 'Action link URL' })
  link?: string;

  @ApiPropertyOptional({ enum: NotificationCategory, default: NotificationCategory.STUDY_RECOMMENDATION })
  category?: NotificationCategory = NotificationCategory.STUDY_RECOMMENDATION;
}
