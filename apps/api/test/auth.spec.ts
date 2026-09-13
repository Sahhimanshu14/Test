import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/prisma/prisma.service';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { UsersService } from '../src/users/users.service';
import { RoleType, AcademyTarget } from '@cdsprep/types';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as argon2 from 'argon2';

describe('Phase 3 — Authentication, Authorization & Security Suite', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let mockPrisma: any;
  let mockJwt: any;

  beforeEach(() => {
    mockPrisma = {
      client: {
        user: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        role: {
          findUnique: vi.fn().mockResolvedValue({ id: 'role-student-id', name: RoleType.STUDENT }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-log-id' }),
        },
      },
    };

    mockJwt = {
      signAsync: vi.fn().mockImplementation((payload) => {
        return Promise.resolve(`jwt_token_${payload.sub}`);
      }),
      verify: vi.fn(),
    };

    authService = new AuthService(mockPrisma as unknown as PrismaService, mockJwt as unknown as JwtService);
    usersService = new UsersService(mockPrisma as unknown as PrismaService);
  });

  describe('1. Registration', () => {
    it('registers a new student with Argon2id hashed password and does not expose hash', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue(null);
      mockPrisma.client.user.create.mockResolvedValue({
        id: 'u-123',
        email: 'cadet@cdsprep.com',
        fullName: 'Aman Sharma',
        targetAcademy: AcademyTarget.IMA,
        isEmailVerified: false,
        createdAt: new Date(),
      });
      mockPrisma.client.user.update.mockResolvedValue({});

      const result = await authService.register({
        email: 'cadet@cdsprep.com',
        password: 'Password123!',
        fullName: 'Aman Sharma',
        targetAcademy: AcademyTarget.IMA,
      });

      expect(result.user.id).toBe('u-123');
      expect(result.user.email).toBe('cadet@cdsprep.com');
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.verificationToken).toBeDefined();
      expect(mockPrisma.client.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: expect.stringMatching(/^\$argon2id\$/),
          }),
        }),
      );
    });

    it('rejects duplicate email registrations with ConflictException', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        authService.register({
          email: 'existing@cdsprep.com',
          password: 'Password123!',
          fullName: 'Duplicate Cadet',
          targetAcademy: AcademyTarget.IMA,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. Login & Credential Verification', () => {
    it('successfully logs in with valid password and returns sanitized profile', async () => {
      const password = 'CorrectPassword123!';
      const hash = await argon2.hash(password, { type: argon2.argon2id });

      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'user-789',
        email: 'soldier@cdsprep.com',
        passwordHash: hash,
        fullName: 'Vikram Batra',
        targetAcademy: AcademyTarget.IMA,
        isEmailVerified: true,
        currentStreak: 10,
        highestStreak: 25,
        deletedAt: null,
        roles: [
          {
            role: {
              name: RoleType.STUDENT,
              permissions: [{ permission: { action: 'question:read' } }],
            },
          },
        ],
      });
      mockPrisma.client.user.update.mockResolvedValue({});

      const result = await authService.login({
        email: 'soldier@cdsprep.com',
        password,
      });

      expect(result.user.id).toBe('user-789');
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('rejects invalid password with UnauthorizedException and logs audit failure', async () => {
      const hash = await argon2.hash('ActualPassword', { type: argon2.argon2id });

      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'user-789',
        email: 'soldier@cdsprep.com',
        passwordHash: hash,
        deletedAt: null,
      });

      await expect(
        authService.login({
          email: 'soldier@cdsprep.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.client.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AUTH_LOGIN_FAILED',
          }),
        }),
      );
    });

    it('rejects nonexistent user with UnauthorizedException', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'ghost@cdsprep.com',
          password: 'AnyPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('3. Session Management, Refresh Token Rotation & Logout', () => {
    it('revokes session on logout by nullifying refreshTokenHash in database', async () => {
      mockPrisma.client.user.update.mockResolvedValue({});

      const result = await authService.logout('user-123');

      expect(result.message).toBe('Logged out successfully');
      expect(mockPrisma.client.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { refreshTokenHash: null },
      });
    });

    it('detects token replay/reuse and revokes user session immediately', async () => {
      const crypto = await import('crypto');
      const storedHash = crypto.createHash('sha256').update('valid_token').digest('hex');

      mockJwt.verify.mockReturnValue({ sub: 'user-123', email: 'test@cdsprep.com' });
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@cdsprep.com',
        refreshTokenHash: storedHash,
      });

      // An attacker presents an outdated/reused token
      await expect(authService.refreshToken('reused_stale_token')).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify session was revoked
      expect(mockPrisma.client.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { refreshTokenHash: null },
      });
    });
  });

  describe('4. Reset Password & Email Verification', () => {
    it('generates a reset token and updates expiry for password reset request', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'u-pw-reset',
        email: 'reset@cdsprep.com',
      });
      mockPrisma.client.user.update.mockResolvedValue({});

      const response = await authService.forgotPassword({ email: 'reset@cdsprep.com' });

      expect(response.resetToken).toBeDefined();
      expect(mockPrisma.client.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-pw-reset' },
          data: expect.objectContaining({
            resetPasswordToken: expect.any(String),
            resetPasswordExpires: expect.any(Date),
          }),
        }),
      );
    });

    it('successfully resets password, updates hash, and clears all active sessions', async () => {
      mockPrisma.client.user.findFirst.mockResolvedValue({
        id: 'u-pw-reset',
        email: 'reset@cdsprep.com',
      });
      mockPrisma.client.user.update.mockResolvedValue({});

      const response = await authService.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'BrandNewSecurePassword123!',
      });

      expect(response.message).toContain('Password has been reset successfully');
      expect(mockPrisma.client.user.update).toHaveBeenCalledWith({
        where: { id: 'u-pw-reset' },
        data: {
          passwordHash: expect.stringMatching(/^\$argon2id\$/),
          resetPasswordToken: null,
          resetPasswordExpires: null,
          refreshTokenHash: null,
        },
      });
    });

    it('rejects invalid or expired reset token with BadRequestException', async () => {
      mockPrisma.client.user.findFirst.mockResolvedValue(null);

      await expect(
        authService.resetPassword({
          token: 'expired-token',
          newPassword: 'BrandNewSecurePassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. Authorization & Role Restrictions (RBAC)', () => {
    let reflector: Reflector;
    let rolesGuard: RolesGuard;
    let permissionsGuard: PermissionsGuard;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
      permissionsGuard = new PermissionsGuard(reflector);
    });

    function createMockContext(user: any, requiredRoles?: RoleType[], requiredPermissions?: string[]) {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
        if (key === 'roles') return requiredRoles;
        if (key === 'permissions') return requiredPermissions;
        if (key === 'isPublic') return false;
        return undefined;
      });

      return {
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
    }

    it('blocks STUDENT from accessing ADMIN restricted endpoints', () => {
      const studentUser = { id: 's-1', roles: [RoleType.STUDENT] };
      const context = createMockContext(studentUser, [RoleType.ADMIN]);

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows ADMIN to access ADMIN restricted endpoints', () => {
      const adminUser = { id: 'a-1', roles: [RoleType.ADMIN] };
      const context = createMockContext(adminUser, [RoleType.ADMIN]);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('blocks ADMIN users from automatically receiving SUPER_ADMIN endpoints', () => {
      const adminUser = { id: 'a-1', roles: [RoleType.ADMIN] };
      const context = createMockContext(adminUser, [RoleType.SUPER_ADMIN]);

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('permits SUPER_ADMIN full override access', () => {
      const superAdminUser = { id: 'sa-1', roles: [RoleType.SUPER_ADMIN] };
      const context = createMockContext(superAdminUser, [RoleType.ADMIN]);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('enforces granular permissions with PermissionsGuard', () => {
      const editorWithoutPublish = {
        id: 'ed-1',
        roles: [RoleType.CONTENT_EDITOR],
        permissions: ['question:create', 'question:update'],
      };
      const context = createMockContext(editorWithoutPublish, undefined, ['question:publish']);

      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);

      const moderatorWithPublish = {
        id: 'mod-1',
        roles: [RoleType.MODERATOR],
        permissions: ['question:update', 'question:publish'],
      };
      const validContext = createMockContext(moderatorWithPublish, undefined, ['question:publish']);

      expect(permissionsGuard.canActivate(validContext)).toBe(true);
    });
  });

  describe('6. IDOR (Insecure Direct Object Reference) Prevention', () => {
    it('blocks student trying to access another student profile', async () => {
      const requester = {
        id: 'student-A',
        roles: [RoleType.STUDENT],
        permissions: [],
      };

      await expect(usersService.getUserById(requester, 'student-B')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows student to access their own profile', async () => {
      const requester = {
        id: 'student-A',
        roles: [RoleType.STUDENT],
        permissions: [],
      };

      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'student-A',
        email: 'cadetA@cdsprep.com',
        fullName: 'Cadet A',
        targetAcademy: AcademyTarget.IMA,
        roles: [{ role: { name: RoleType.STUDENT } }],
      });

      const profile = await usersService.getUserById(requester, 'student-A');
      expect(profile.id).toBe('student-A');
    });

    it('allows admin or user:read staff to inspect student profile', async () => {
      const adminRequester = {
        id: 'admin-1',
        roles: [RoleType.ADMIN],
        permissions: ['user:read'],
      };

      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'student-B',
        email: 'cadetB@cdsprep.com',
        fullName: 'Cadet B',
        targetAcademy: AcademyTarget.AFA,
        roles: [{ role: { name: RoleType.STUDENT } }],
      });

      const profile = await usersService.getUserById(adminRequester, 'student-B');
      expect(profile.id).toBe('student-B');
    });
  });
});
