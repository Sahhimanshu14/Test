import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationsService } from '../src/notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';

describe('Notifications Service Suite', () => {
  let notificationsService: NotificationsService;
  let mockPrisma: any;

  const userId = 'cadet-user-01';

  beforeEach(() => {
    mockPrisma = {
      client: {
        notification: {
          count: vi.fn(),
          findMany: vi.fn(),
          create: vi.fn(),
          updateMany: vi.fn(),
        },
        user: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      },
    };

    notificationsService = new NotificationsService(mockPrisma);
  });

  describe('listNotifications', () => {
    it('returns paginated notifications and accurate unreadCount', async () => {
      mockPrisma.client.notification.count
        .mockResolvedValueOnce(25) // total
        .mockResolvedValueOnce(3); // unreadCount

      mockPrisma.client.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId,
          title: 'Daily Goal Complete',
          message: 'You completed 20 questions today!',
          isRead: false,
        },
      ]);

      const result = await notificationsService.listNotifications(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.unreadCount).toBe(3);
      expect(result.items).toHaveLength(1);
    });

    it('applies unreadOnly filter when requested', async () => {
      mockPrisma.client.notification.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2);
      mockPrisma.client.notification.findMany.mockResolvedValue([]);

      await notificationsService.listNotifications(userId, { unreadOnly: true });

      expect(mockPrisma.client.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, isRead: false },
        }),
      );
    });
  });

  describe('getPreferences & updatePreferences', () => {
    it('returns merged default preferences when user preferences are empty', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: userId,
        preferences: null,
      });

      const prefs = await notificationsService.getPreferences(userId);
      expect(prefs.testResults).toBe(true);
      expect(prefs.dailyReminders).toBe(true);
      expect(prefs.weeklySummary).toBe(true);
    });

    it('throws NotFoundException when getting preferences for non-existent user', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue(null);

      await expect(notificationsService.getPreferences('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates and persists merged preferences', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: userId,
        preferences: { theme: 'dark' },
      });
      mockPrisma.client.user.update.mockResolvedValue({});

      const updated = await notificationsService.updatePreferences(userId, {
        dailyReminders: false,
      });

      expect(updated.dailyReminders).toBe(false);
      expect(mockPrisma.client.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          preferences: expect.objectContaining({
            theme: 'dark',
            notificationPreferences: expect.objectContaining({
              dailyReminders: false,
              testResults: true,
            }),
          }),
        },
      });
    });
  });

  describe('createNotification', () => {
    it('creates a new notification record', async () => {
      mockPrisma.client.notification.create.mockResolvedValue({
        id: 'notif-new',
        userId,
        title: 'Badge Unlocked',
        message: 'You earned the Centurion badge!',
        link: '/badges',
      });

      const res = await notificationsService.createNotification(userId, {
        title: 'Badge Unlocked',
        message: 'You earned the Centurion badge!',
        link: '/badges',
      });

      expect(res.id).toBe('notif-new');
      expect(mockPrisma.client.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          title: 'Badge Unlocked',
          message: 'You earned the Centurion badge!',
          link: '/badges',
        },
      });
    });
  });

  describe('markAsRead & markAllAsRead', () => {
    it('marks a single notification as read scoped to user', async () => {
      mockPrisma.client.notification.updateMany.mockResolvedValue({ count: 1 });

      await notificationsService.markAsRead(userId, 'notif-1');

      expect(mockPrisma.client.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId },
        data: { isRead: true },
      });
    });

    it('marks all unread notifications as read scoped to user', async () => {
      mockPrisma.client.notification.updateMany.mockResolvedValue({ count: 5 });

      await notificationsService.markAllAsRead(userId);

      expect(mockPrisma.client.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    });
  });
});
