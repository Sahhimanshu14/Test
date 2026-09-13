import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcademyTarget } from '@cdsprep/types';
import { evaluateActiveStreak } from '../common/utils/streak.util';

export interface UpdateProfileDto {
  fullName?: string;
  avatarUrl?: string;
  targetAcademy?: AcademyTarget;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        targetAcademy: true,
        avatarUrl: true,
        currentStreak: true,
        highestStreak: true,
        lastActiveDate: true,
        preferences: true,
        createdAt: true,
        roles: {
          select: { role: { select: { name: true } } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const streakEvaluation = evaluateActiveStreak(
      user.currentStreak,
      user.lastActiveDate,
    );

    return {
      ...user,
      currentStreak: streakEvaluation.currentStreak,
      isActiveToday: streakEvaluation.isActiveToday,
      roles: user.roles.map((r) => r.role.name),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.client.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.targetAcademy ? { targetAcademy: dto.targetAcademy } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        targetAcademy: true,
        avatarUrl: true,
        preferences: true,
      },
    });
  }

  async updateTargetAcademy(userId: string, targetAcademy: AcademyTarget) {
    return this.updateProfile(userId, { targetAcademy });
  }

  async updatePreferences(userId: string, preferences: Record<string, any>) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingPrefs = (user.preferences as Record<string, any>) || {};
    const merged = { ...existingPrefs, ...preferences };

    return this.prisma.client.user.update({
      where: { id: userId },
      data: { preferences: merged },
      select: {
        id: true,
        preferences: true,
      },
    });
  }

  async getUserById(
    requester: { id: string; roles: string[]; permissions: string[] },
    targetUserId: string,
  ) {
    const isOwner = requester.id === targetUserId;
    const isStaff =
      requester.roles?.includes('SUPER_ADMIN') ||
      requester.roles?.includes('ADMIN') ||
      requester.permissions?.includes('user:read');

    if (!isOwner && !isStaff) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException(
        'IDOR violation: unauthorized access to another user account',
      );
    }

    return this.getProfile(targetUserId);
  }
}
