import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminService } from '../src/admin/admin.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { RoleType, QuestionStatus, ReportStatus, AcademyTarget } from '@cdsprep/types';
import { AccountModerationAction, ReportResolutionAction } from '../src/admin/dto/admin.dto';

describe('Phase 12 — Admin Panel & Security Authorization Suite', () => {
  let adminService: AdminService;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;
  let mockPrisma: any;
  let mockAudit: any;

  const mockStudent = {
    id: 'user-student-001',
    email: 'student.cadet@cdsprep.in',
    fullName: 'Cadet Candidate',
    roles: [RoleType.STUDENT],
  };

  const mockAdmin = {
    id: 'user-admin-002',
    email: 'officer.admin@cdsprep.in',
    fullName: 'Captain Admin',
    roles: [RoleType.ADMIN],
  };

  const mockSuperAdmin = {
    id: 'user-superadmin-003',
    email: 'general.super@cdsprep.in',
    fullName: 'General Super Admin',
    roles: [RoleType.SUPER_ADMIN],
  };

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);

    mockAudit = {
      logAction: vi.fn().mockResolvedValue({ id: 'audit-log-01' }),
      listAuditLogs: vi.fn(),
    };

    mockPrisma = {
      client: {
        user: {
          count: vi.fn().mockResolvedValue(150),
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        question: {
          count: vi.fn().mockResolvedValue(500),
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 5 }),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        questionOption: {
          deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
          createMany: vi.fn().mockResolvedValue({ count: 4 }),
        },
        questionExplanation: {
          upsert: vi.fn().mockResolvedValue({ id: 'exp-1' }),
        },
        pYQPaper: {
          count: vi.fn().mockResolvedValue(25),
          findMany: vi.fn(),
          groupBy: vi.fn().mockResolvedValue([]),
        },
        test: {
          count: vi.fn().mockResolvedValue(12),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        testAttempt: {
          count: vi.fn().mockResolvedValue(320),
        },
        questionReport: {
          count: vi.fn().mockResolvedValue(8),
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        role: {
          findUnique: vi.fn(),
        },
        userRole: {
          upsert: vi.fn().mockResolvedValue({ id: 'ur-1' }),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          count: vi.fn().mockResolvedValue(3),
        },
        subject: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn(),
          create: vi.fn(),
        },
        chapter: {
          create: vi.fn(),
        },
        topic: {
          create: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        $transaction: vi.fn().mockImplementation(async (callback) => {
          if (typeof callback === 'function') {
            return callback(mockPrisma.client);
          }
          return Promise.all(callback);
        }),
      },
    };

    adminService = new AdminService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
    );
  });

  // Helper to create mock ExecutionContext
  function createMockContext(user: any, requiredRoles: RoleType[] = [RoleType.ADMIN, RoleType.SUPER_ADMIN]) {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === 'roles') return requiredRoles;
      if (key === 'isPublic') return false;
      return undefined;
    });

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  // ===========================================================================
  // 1. AUTHORIZATION & STUDENT ACCESS LOCKDOWN
  // ===========================================================================
  describe('1. Security Authorization & Student Access Lockdown', () => {
    it('strictly denies STUDENT access to administrative endpoints with 403 Forbidden', () => {
      const context = createMockContext(mockStudent, [RoleType.ADMIN, RoleType.SUPER_ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('denies standard ADMIN from Super Admin restricted operations (e.g. role modification)', () => {
      const context = createMockContext(mockAdmin, [RoleType.SUPER_ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('grants SUPER_ADMIN access to all administrative endpoints', () => {
      const context = createMockContext(mockSuperAdmin, [RoleType.SUPER_ADMIN]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('grants ADMIN access to general administrative endpoints', () => {
      const context = createMockContext(mockAdmin, [RoleType.ADMIN, RoleType.SUPER_ADMIN]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });

  // ===========================================================================
  // 2. DASHBOARD & OPERATIONAL TELEMETRY METRICS
  // ===========================================================================
  describe('2. Dashboard & Operational Telemetry', () => {
    it('aggregates live platform metrics across users, questions, pyqs, tests, attempts, and reports', async () => {
      const metrics = await adminService.getPlatformMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.users.total).toBe(150);
      expect(metrics.questions.total).toBe(500);
      expect(metrics.pyqPapers.total).toBe(25);
      expect(metrics.tests.total).toBe(12);
      expect(metrics.attempts.total).toBe(320);
      expect(metrics.reports.total).toBe(8);
      expect(metrics.system).toBeDefined();
      expect(metrics.system.maintenanceMode).toBe(false);
    });
  });

  // ===========================================================================
  // 3. USER MANAGEMENT & ROLE PROTECTION
  // ===========================================================================
  describe('3. User Management & Moderation', () => {
    it('lists users with search, role, and academy filtering', async () => {
      mockPrisma.client.user.count.mockResolvedValueOnce(1);
      mockPrisma.client.user.findMany.mockResolvedValueOnce([
        {
          id: 'u-1',
          email: 'cadet@cdsprep.in',
          fullName: 'Cadet Vikram',
          targetAcademy: AcademyTarget.IMA,
          isEmailVerified: true,
          roles: [{ role: { name: RoleType.STUDENT } }],
          _count: { attempts: 2, practiceSessions: 5, reports: 0 },
        },
      ]);

      const result = await adminService.listUsers({
        search: 'Vikram',
        role: RoleType.STUDENT,
        academy: AcademyTarget.IMA,
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].fullName).toBe('Cadet Vikram');
      expect(result.items[0].roles).toContain(RoleType.STUDENT);
      expect(result.pagination.total).toBe(1);
    });

    it('suspends user account and logs audit trail', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValueOnce({
        id: 'u-bad',
        email: 'spammer@cdsprep.in',
      });
      mockPrisma.client.user.update.mockResolvedValueOnce({
        id: 'u-bad',
        deletedAt: new Date(),
      });

      const res = await adminService.updateUserStatus(
        'u-bad',
        { action: AccountModerationAction.SUSPEND, reason: 'Malicious content spam' },
        mockSuperAdmin.id,
        '192.168.1.1',
      );

      expect(res.success).toBe(true);
      expect(res.action).toBe(AccountModerationAction.SUSPEND);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        mockSuperAdmin.id,
        'USER_SUSPEND',
        'User',
        'u-bad',
        expect.objectContaining({ reason: 'Malicious content spam' }),
        '192.168.1.1',
      );
    });

    it('prevents staff officers from suspending their own account', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValueOnce({
        id: mockAdmin.id,
        email: mockAdmin.email,
      });

      await expect(
        adminService.updateUserStatus(
          mockAdmin.id,
          { action: AccountModerationAction.SUSPEND },
          mockAdmin.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('assigns staff role and logs audit trail', async () => {
      mockPrisma.client.role.findUnique.mockResolvedValueOnce({
        id: 'r-admin',
        name: RoleType.ADMIN,
      });

      await adminService.assignRole('target-user-01', RoleType.ADMIN, mockSuperAdmin.id);

      expect(mockPrisma.client.userRole.upsert).toHaveBeenCalled();
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        mockSuperAdmin.id,
        'ASSIGN_ROLE',
        'User',
        'target-user-01',
        { assignedRole: RoleType.ADMIN },
        undefined,
      );
    });

    it('prevents revoking the last remaining SUPER_ADMIN role', async () => {
      mockPrisma.client.role.findUnique.mockResolvedValueOnce({
        id: 'r-super',
        name: RoleType.SUPER_ADMIN,
      });
      mockPrisma.client.userRole.count.mockResolvedValueOnce(1); // Sole Super Admin remaining!

      await expect(
        adminService.revokeRole('super-user-01', RoleType.SUPER_ADMIN, mockSuperAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================================
  // 4. CANDIDATE QUESTION REPORTS MODERATION
  // ===========================================================================
  describe('4. Question Reports Moderation', () => {
    it('lists reports with filtering by status', async () => {
      mockPrisma.client.questionReport.findMany.mockResolvedValueOnce([
        {
          id: 'rep-01',
          reason: 'Typo in Option C',
          status: ReportStatus.PENDING,
          question: { id: 'q-1', questionText: 'Sample math question' },
          user: { id: 'u-1', email: 'cadet@cdsprep.in' },
        },
      ]);

      const result = await adminService.listReports({ status: ReportStatus.PENDING });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].reason).toBe('Typo in Option C');
    });

    it('resolves a report, updates details, and logs audit trail', async () => {
      mockPrisma.client.questionReport.findUnique.mockResolvedValueOnce({
        id: 'rep-01',
        questionId: 'q-101',
        details: 'Initial report text',
      });
      mockPrisma.client.questionReport.update.mockResolvedValueOnce({
        id: 'rep-01',
        status: ReportStatus.RESOLVED,
      });

      await adminService.resolveReport(
        'rep-01',
        { action: ReportResolutionAction.RESOLVE, notes: 'Corrected Option C typo' },
        mockAdmin.id,
        '10.0.0.1',
      );

      expect(mockPrisma.client.questionReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rep-01' },
          data: expect.objectContaining({ status: ReportStatus.RESOLVED }),
        }),
      );
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        mockAdmin.id,
        'REPORT_RESOLVE',
        'QuestionReport',
        'rep-01',
        expect.objectContaining({ status: ReportStatus.RESOLVED }),
        '10.0.0.1',
      );
    });

    it('resolves a report with questionFix, updates question options, and republishes', async () => {
      mockPrisma.client.questionReport.findUnique.mockResolvedValueOnce({
        id: 'rep-02',
        questionId: 'q-102',
        details: 'Wrong answer key',
      });
      mockPrisma.client.questionReport.update.mockResolvedValueOnce({
        id: 'rep-02',
        status: ReportStatus.RESOLVED,
      });

      await adminService.resolveReport(
        'rep-02',
        {
          action: ReportResolutionAction.RESOLVE,
          notes: 'Fixed answer key and republished',
          questionFix: {
            questionText: 'Fixed question text?',
            options: [
              { identifier: 'A', optionText: 'Correct Option', isCorrect: true },
              { identifier: 'B', optionText: 'Incorrect Option', isCorrect: false },
            ],
            explanation: 'Detailed corrected explanation',
            republish: true,
          },
        },
        mockAdmin.id,
      );

      expect(mockPrisma.client.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q-102' },
          data: expect.objectContaining({
            questionText: 'Fixed question text?',
            status: QuestionStatus.PUBLISHED,
            reviewedById: mockAdmin.id,
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // 5. TEST BUILDER PRE-PUBLISH VALIDATION
  // ===========================================================================
  describe('5. Test Builder Pre-Publish Validation', () => {
    it('fails pre-publish validation when test has no sections', async () => {
      mockPrisma.client.test.findUnique.mockResolvedValueOnce({
        id: 'test-empty',
        title: 'Empty Mock Test',
        durationMinutes: 120,
        instructions: 'Read carefully',
        totalMarks: 100,
        sections: [],
      });

      await expect(
        adminService.validateAndPublishTest('test-empty', mockAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('fails pre-publish validation when marks do not match question totals', async () => {
      mockPrisma.client.test.findUnique.mockResolvedValueOnce({
        id: 'test-mismatch',
        title: 'Mismatch Test',
        durationMinutes: 120,
        instructions: 'Test instructions',
        totalMarks: 100,
        sections: [
          {
            name: 'Section 1',
            testQuestions: [
              { question: { id: 'q-1', marks: 1.0, status: QuestionStatus.PUBLISHED } },
              { question: { id: 'q-2', marks: 1.0, status: QuestionStatus.PUBLISHED } },
            ],
          },
        ],
      });

      await expect(
        adminService.validateAndPublishTest('test-mismatch', mockAdmin.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully publishes test when sections, questions, and marks are valid', async () => {
      mockPrisma.client.test.findUnique.mockResolvedValueOnce({
        id: 'test-valid',
        title: 'Valid CDS Mathematics Mock 1',
        durationMinutes: 120,
        instructions: 'Official instructions: 100 questions, 100 marks.',
        totalMarks: 2,
        sections: [
          {
            name: 'Arithmetic',
            testQuestions: [
              { question: { id: 'q-1', marks: 1.0, status: QuestionStatus.PUBLISHED } },
              { question: { id: 'q-2', marks: 1.0, status: QuestionStatus.PUBLISHED } },
            ],
          },
        ],
      });
      mockPrisma.client.test.update.mockResolvedValueOnce({
        id: 'test-valid',
        isPublished: true,
      });

      const res = await adminService.validateAndPublishTest('test-valid', mockAdmin.id);

      expect(res.success).toBe(true);
      expect(res.isPublished).toBe(true);
      expect(res.validationPassed).toBe(true);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        mockAdmin.id,
        'PUBLISH_TEST',
        'Test',
        'test-valid',
        expect.objectContaining({ totalMarks: 2, totalQuestions: 2 }),
        undefined,
      );
    });
  });

  // ===========================================================================
  // 6. AI MODERATION & BATCH APPROVAL
  // ===========================================================================
  describe('6. AI Moderation & Batch Approval', () => {
    it('batch approves AI-generated draft questions and logs audit trail', async () => {
      const res = await adminService.batchApproveAiQuestions(
        { questionIds: ['q-ai-1', 'q-ai-2', 'q-ai-3'], targetStatus: QuestionStatus.APPROVED },
        mockAdmin.id,
      );

      expect(res.success).toBe(true);
      expect(res.approvedCount).toBe(5);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        mockAdmin.id,
        'BATCH_APPROVE_AI_QUESTIONS',
        'Question',
        'q-ai-1,q-ai-2,q-ai-3',
        expect.objectContaining({ count: 5, targetStatus: QuestionStatus.APPROVED }),
        undefined,
      );
    });
  });

  // ===========================================================================
  // 7. SYSTEM SETTINGS
  // ===========================================================================
  describe('7. System Settings Management', () => {
    it('updates system operational parameters and writes audit log', async () => {
      const updated = await adminService.updateSystemSettings(
        { maintenanceMode: true, aiDailyGenerationLimit: 500 },
        mockSuperAdmin.id,
        '127.0.0.1',
      );

      expect(updated.maintenanceMode).toBe(true);
      expect(updated.aiDailyGenerationLimit).toBe(500);
      expect(mockAudit.logAction).toHaveBeenCalledWith(
        mockSuperAdmin.id,
        'UPDATE_SYSTEM_SETTINGS',
        'SystemSettings',
        'GLOBAL',
        expect.objectContaining({ maintenanceMode: true }),
        '127.0.0.1',
      );
    });
  });

  // ===========================================================================
  // 8. CONTENT DASHBOARD & QUALITY METRICS
  // ===========================================================================
  describe('8. Content Dashboard & Quality Metrics', () => {
    it('computes content metrics, PYQs by year, and quality issue counts', async () => {
      mockPrisma.client.question.count
        .mockResolvedValueOnce(250) // total
        .mockResolvedValueOnce(200) // published
        .mockResolvedValueOnce(30)  // drafts
        .mockResolvedValueOnce(15)  // pendingReview
        .mockResolvedValueOnce(5)   // reported
        .mockResolvedValueOnce(2)   // archived
        .mockResolvedValueOnce(3);  // missingExplanationCount

      mockPrisma.client.pYQPaper.groupBy.mockResolvedValueOnce([
        { year: 2024, _count: { id: 3 } },
        { year: 2023, _count: { id: 6 } },
      ]);

      mockPrisma.client.question.groupBy
        .mockResolvedValueOnce([{ subjectId: 'sub-gk', _count: { id: 100 } }])
        .mockResolvedValueOnce([{ topicId: 'top-polity', subjectId: 'sub-gk', _count: { id: 25 } }]);

      mockPrisma.client.question.findMany.mockResolvedValueOnce([
        {
          id: 'q-invalid-opts',
          questionType: 'MCQ_SINGLE',
          questionText: 'Test formula $x = 2$ and another unbalanced $$y = 3',
          options: [{ id: 'opt-1', isCorrect: false }],
          explanation: { explanation: 'Short explanation' },
          metadata: null,
        },
      ]);

      const stats = await adminService.getContentDashboardStats();

      expect(stats.totalQuestions).toBe(250);
      expect(stats.published).toBe(200);
      expect(stats.drafts).toBe(30);
      expect(stats.pendingReview).toBe(15);
      expect(stats.reported).toBe(5);
      expect(stats.archived).toBe(2);
      expect(stats.pyqsByYear).toEqual([
        { year: 2024, count: 3 },
        { year: 2023, count: 6 },
      ]);
      expect(stats.qualityIssues.missingExplanation).toBe(3);
      expect(stats.qualityIssues.invalidOptionCount).toBe(1);
      expect(stats.qualityIssues.unbalancedEquations).toBe(1);
    });
  });
});

