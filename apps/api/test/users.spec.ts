import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from '../src/users/users.service';
import { AcademyTarget } from '@cdsprep/types';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('Users Service Suite', () => {
  let usersService: UsersService;
  let mockPrisma: any;

  const userId = 'cadet-user-01';
  const otherUserId = 'cadet-user-02';

  beforeEach(() => {
    mockPrisma = {
      client: {
        user: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      },
    };

    usersService = new UsersService(mockPrisma);
  });

  describe('getProfile', () => {
    it('returns user profile with computed streak and flattened roles', async () => {
      const today = new Date();
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'cadet@example.com',
        fullName: 'Arjun Singh',
        targetAcademy: AcademyTarget.IMA,
        avatarUrl: null,
        currentStreak: 5,
        highestStreak: 12,
        lastActiveDate: today,
        preferences: {},
        createdAt: new Date(),
        roles: [{ role: { name: 'CADET' } }],
      });

      const profile = await usersService.getProfile(userId);
      expect(profile.id).toBe(userId);
      expect(profile.roles).toEqual(['CADET']);
      expect(profile.isActiveToday).toBe(true);
      expect(profile.currentStreak).toBe(5);
    });

    it('throws NotFoundException when profile is not found', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue(null);

      await expect(usersService.getProfile('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('trims fullName and updates profile fields', async () => {
      mockPrisma.client.user.update.mockResolvedValue({
        id: userId,
        fullName: 'Major Vikram Batra',
        targetAcademy: AcademyTarget.OTA,
        avatarUrl: 'https://cdn.example.com/batra.jpg',
      });

      const updated = await usersService.updateProfile(userId, {
        fullName: '  Major Vikram Batra  ',
        targetAcademy: AcademyTarget.OTA,
        avatarUrl: 'https://cdn.example.com/batra.jpg',
      });

      expect(updated.fullName).toBe('Major Vikram Batra');
      expect(mockPrisma.client.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          fullName: 'Major Vikram Batra',
          targetAcademy: AcademyTarget.OTA,
          avatarUrl: 'https://cdn.example.com/batra.jpg',
        },
        select: expect.any(Object),
      });
    });
  });

  describe('updatePreferences', () => {
    it('merges new preferences with existing user preferences', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: userId,
        preferences: { theme: 'dark', language: 'en' },
      });

      mockPrisma.client.user.update.mockResolvedValue({
        id: userId,
        preferences: { theme: 'light', language: 'en', sound: true },
      });

      const res = await usersService.updatePreferences(userId, {
        theme: 'light',
        sound: true,
      });

      expect(mockPrisma.client.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          preferences: {
            theme: 'light',
            language: 'en',
            sound: true,
          },
        },
        select: expect.any(Object),
      });
      expect(res.preferences.sound).toBe(true);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue(null);

      await expect(
        usersService.updatePreferences('missing-id', { theme: 'dark' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserById & IDOR Protection', () => {
    it('permits user to access their own profile', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'cadet@example.com',
        fullName: 'Self',
        roles: [],
      });

      const profile = await usersService.getUserById(
        { id: userId, roles: ['CADET'], permissions: [] },
        userId,
      );

      expect(profile.id).toBe(userId);
    });

    it('permits admin to access any user profile', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: otherUserId,
        email: 'other@example.com',
        fullName: 'Other Cadet',
        roles: [],
      });

      const profile = await usersService.getUserById(
        { id: 'admin-id', roles: ['ADMIN'], permissions: [] },
        otherUserId,
      );

      expect(profile.id).toBe(otherUserId);
    });

    it('throws ForbiddenException when non-admin accesses another user profile (IDOR)', async () => {
      await expect(
        usersService.getUserById(
          { id: userId, roles: ['CADET'], permissions: [] },
          otherUserId,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.client.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
