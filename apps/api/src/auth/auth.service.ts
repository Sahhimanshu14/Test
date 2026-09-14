import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { RoleType } from '@cdsprep/types';
import {
  RegisterInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  ChangePasswordInput,
} from '@cdsprep/validation';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  // Brute-force & credential stuffing defense: in-memory failed attempts tracking
  private readonly failedLoginAttempts = new Map<
    string,
    { count: number; lockedUntil?: number; lastAttempt: number }
  >();

  private getAccessSecret(): string {
    const secret =
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      'cdsprep_secure_jwt_access_secret_32_characters_long';
    return secret;
  }

  private getRefreshSecret(): string {
    const secret =
      process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET ||
      'cdsprep_secure_jwt_refresh_secret_32_characters_long';
    return secret;
  }

  private recordFailedAttempt(emailKey: string): boolean {
    const now = Date.now();
    const record = this.failedLoginAttempts.get(emailKey);
    const currentCount =
      record && now - record.lastAttempt < 15 * 60 * 1000 ? record.count : 0;
    const newCount = currentCount + 1;

    if (newCount >= 5) {
      this.failedLoginAttempts.set(emailKey, {
        count: newCount,
        lockedUntil: now + 15 * 60 * 1000,
        lastAttempt: now,
      });
      return true; // Account is now locked
    } else {
      this.failedLoginAttempts.set(emailKey, {
        count: newCount,
        lastAttempt: now,
      });
      return false;
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async createAuditLog(params: {
    userId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    ipAddress?: string | null;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.prisma.client.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType || 'user',
          entityId: params.entityId || params.userId || 'system',
          ipAddress: params.ipAddress || null,
          metadata: params.metadata || undefined,
        },
      });
    } catch {
      // Non-blocking observability
    }
  }

  async register(dto: RegisterInput, ipAddress?: string) {
    const existing = await this.prisma.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(
        'An account with this email address already exists',
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const studentRole = await this.prisma.client.role.findUnique({
      where: { name: RoleType.STUDENT },
    });

    const user = await this.prisma.client.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        targetAcademy: dto.targetAcademy,
        verificationToken,
        isEmailVerified: false,
        roles: studentRole
          ? {
              create: [{ roleId: studentRole.id }],
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        targetAcademy: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    const refreshTokenHash = this.hashToken(tokens.refreshToken);

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    await this.createAuditLog({
      userId: user.id,
      action: 'AUTH_REGISTER',
      entityId: user.id,
      ipAddress,
      metadata: {
        email: user.email,
        targetAcademy: user.targetAcademy,
      },
    });

    if (this.emailService) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;
      const code = verificationToken.slice(0, 6).toUpperCase();
      this.emailService.sendVerificationEmail(user.email, user.fullName, code, verifyUrl).catch(() => {});
      this.emailService.sendWelcomeCadetEmail(user.email, user.fullName, user.targetAcademy || 'Indian Military Academy').catch(() => {});
    }

    return {
      user: {
        ...user,
        roles: [RoleType.STUDENT],
        permissions: [],
      },
      tokens,
      verificationToken,
    };
  }

  async login(dto: LoginInput, ipAddress?: string, userAgent?: string) {
    const emailKey = dto.email.toLowerCase();

    // 1. Check account lockout state
    const attemptRecord = this.failedLoginAttempts.get(emailKey);
    if (attemptRecord && attemptRecord.lockedUntil && attemptRecord.lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account is temporarily locked due to excessive failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`,
      );
    }

    const user = await this.prisma.client.user.findUnique({
      where: { email: emailKey },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      this.recordFailedAttempt(emailKey);
      await this.createAuditLog({
        userId: user?.id || null,
        action: 'AUTH_LOGIN_FAILED',
        entityId: user?.id || 'unknown',
        ipAddress,
        metadata: {
          email: emailKey,
          reason: 'USER_NOT_FOUND_OR_DELETED',
          userAgent,
        },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      const isNowLocked = this.recordFailedAttempt(emailKey);
      await this.createAuditLog({
        userId: user.id,
        action: isNowLocked ? 'AUTH_ACCOUNT_LOCKED' : 'AUTH_LOGIN_FAILED',
        entityId: user.id,
        ipAddress,
        metadata: {
          email: user.email,
          reason: isNowLocked ? 'LOCKED_EXCESSIVE_FAILED_LOGINS' : 'BAD_PASSWORD',
          userAgent,
        },
      });

      if (isNowLocked) {
        throw new UnauthorizedException(
          'Account has been temporarily locked for 15 minutes due to multiple consecutive failed login attempts.',
        );
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed login tracking on success
    this.failedLoginAttempts.delete(emailKey);

    const tokens = await this.generateTokens(user.id, user.email);
    const refreshTokenHash = this.hashToken(tokens.refreshToken);

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        lastActiveDate: new Date(),
      },
    });

    await this.createAuditLog({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityId: user.id,
      ipAddress,
      metadata: { userAgent },
    });

    const roles = user.roles.map((r) => r.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((r) =>
          r.role.permissions.map((rp) => rp.permission.action),
        ),
      ),
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        targetAcademy: user.targetAcademy,
        isEmailVerified: user.isEmailVerified,
        currentStreak: user.currentStreak,
        highestStreak: user.highestStreak,
        roles,
        permissions,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string, ipAddress?: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.getRefreshSecret(),
      });

      const user = await this.prisma.client.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.deletedAt || !user.refreshTokenHash) {
        throw new UnauthorizedException('Invalid session');
      }

      const incomingHash = this.hashToken(refreshToken);
      if (user.refreshTokenHash !== incomingHash) {
        // Token reused or compromised! Revoke existing session immediately
        await this.prisma.client.user.update({
          where: { id: user.id },
          data: { refreshTokenHash: null },
        });

        await this.createAuditLog({
          userId: user.id,
          action: 'AUTH_REFRESH_TOKEN_REUSE_DETECTED',
          entityId: user.id,
          ipAddress,
        });

        throw new UnauthorizedException('Session revoked due to token conflict');
      }

      // Rotate tokens
      const newTokens = await this.generateTokens(user.id, user.email);
      const newHash = this.hashToken(newTokens.refreshToken);

      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: newHash },
      });

      return newTokens;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, ipAddress?: string) {
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    await this.createAuditLog({
      userId,
      action: 'AUTH_LOGOUT',
      entityId: userId,
      ipAddress,
    });

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: PasswordResetRequestInput, ipAddress?: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Timing attack mitigation & user enumeration prevention
    if (!user || user.deletedAt) {
      return {
        message:
          'If an account exists with this email, a password reset link has been dispatched.',
      };
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = this.hashToken(rawResetToken);
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedResetToken,
        resetPasswordExpires,
      },
    });

    await this.createAuditLog({
      userId: user.id,
      action: 'AUTH_FORGOT_PASSWORD_REQUEST',
      entityId: user.id,
      ipAddress,
    });

    if (this.emailService) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${rawResetToken}`;
      this.emailService.sendPasswordResetEmail(user.email, user.fullName, resetUrl, ipAddress).catch(() => {});
    }

    const isTestEnv = process.env.NODE_ENV === 'test';
    return {
      message:
        'If an account exists with this email, a password reset link has been dispatched.',
      ...(isTestEnv ? { resetToken: rawResetToken } : {}),
    };
  }

  async resetPassword(dto: PasswordResetConfirmInput, ipAddress?: string) {
    const hashedToken = this.hashToken(dto.token);

    const user = await this.prisma.client.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    // Update password, clear reset token, invalidate all existing sessions, and clear failed login locks
    this.failedLoginAttempts.delete(user.email.toLowerCase());
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        refreshTokenHash: null,
      },
    });

    await this.createAuditLog({
      userId: user.id,
      action: 'AUTH_RESET_PASSWORD_SUCCESS',
      entityId: user.id,
      ipAddress,
    });

    if (this.emailService) {
      this.emailService.sendPasswordChangedEmail(user.email, user.fullName, ipAddress).catch(() => {});
    }

    return {
      message:
        'Password has been reset successfully. Please log in with your new password.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.client.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired email verification token');
    }

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
      },
    });

    await this.createAuditLog({
      userId: user.id,
      action: 'AUTH_VERIFY_EMAIL',
      entityId: user.id,
    });

    return { message: 'Email verified successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordInput, ipAddress?: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshTokenHash: null, // Invalidate existing sessions
      },
    });

    await this.createAuditLog({
      userId,
      action: 'AUTH_CHANGE_PASSWORD',
      entityId: userId,
      ipAddress,
    });

    if (this.emailService) {
      this.emailService.sendPasswordChangedEmail(user.email, user.fullName, ipAddress).catch(() => {});
    }

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const roles = user.roles.map((r) => r.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((r) =>
          r.role.permissions.map((rp) => rp.permission.action),
        ),
      ),
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      targetAcademy: user.targetAcademy,
      isEmailVerified: user.isEmailVerified,
      avatarUrl: user.avatarUrl,
      currentStreak: user.currentStreak,
      highestStreak: user.highestStreak,
      roles,
      permissions,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.getAccessSecret(),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getRefreshSecret(),
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }
}
