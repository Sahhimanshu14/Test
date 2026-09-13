import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationFilterDto,
  NotificationPreferencesDto,
  CreateNotificationDto,
} from './dto/notifications.dto';

const DEFAULT_PREFERENCES: NotificationPreferencesDto = {
  testResults: true,
  dailyReminders: true,
  recommendations: true,
  weeklySummary: true,
  newContent: true,
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(userId: string, filter: NotificationFilterDto = {}) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (filter.unreadOnly) {
      where.isRead = false;
    }

    const [total, unreadCount, items] = await Promise.all([
      this.prisma.client.notification.count({ where: { userId } }),
      this.prisma.client.notification.count({ where: { userId, isRead: false } }),
      this.prisma.client.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const prefs = (user.preferences as Record<string, any>) || {};
    return {
      ...DEFAULT_PREFERENCES,
      ...(prefs.notificationPreferences || {}),
    };
  }

  async updatePreferences(
    userId: string,
    dto: NotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const existingPrefs = (user.preferences as Record<string, any>) || {};
    const updatedNotificationPrefs = {
      ...DEFAULT_PREFERENCES,
      ...(existingPrefs.notificationPreferences || {}),
      ...dto,
    };

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...existingPrefs,
          notificationPreferences: updatedNotificationPrefs,
        },
      },
    });

    return updatedNotificationPrefs;
  }

  async createNotification(userId: string, dto: CreateNotificationDto) {
    return this.prisma.client.notification.create({
      data: {
        userId,
        title: dto.title,
        message: dto.message,
        link: dto.link,
      },
    });
  }

  async markAsRead(userId: string, id: string) {
    return this.prisma.client.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.client.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
