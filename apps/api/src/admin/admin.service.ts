import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  RoleType,
  QuestionStatus,
  QuestionType,
  ReportStatus,
  AcademyTarget,
  ContentDashboardStats,
} from '@cdsprep/types';
import {
  UserFilterQueryDto,
  UpdateUserStatusDto,
  AccountModerationAction,
  ReportFilterQueryDto,
  ResolveReportDto,
  ReportResolutionAction,
  CreateSubjectAdminDto,
  CreateChapterAdminDto,
  CreateTopicAdminDto,
  BatchApproveAiQuestionsDto,
  UpdateSystemSettingsDto,
} from './dto/admin.dto';

// In-memory operational platform settings (default production values)
let platformSettings = {
  maintenanceMode: false,
  defaultNegativeMarking: 0.33,
  timerGracePeriodSeconds: 30,
  aiDailyGenerationLimit: 200,
  updatedAt: new Date().toISOString(),
  updatedBy: 'SYSTEM',
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. TELEMETRY & ACTUAL METRICS
  // ---------------------------------------------------------------------------
  async getPlatformMetrics() {
    const [
      totalUsers,
      verifiedUsers,
      totalQuestions,
      publishedQuestions,
      inReviewQuestions,
      draftQuestions,
      aiDraftQuestions,
      totalPyqs,
      publishedPyqs,
      totalTests,
      publishedTests,
      totalAttempts,
      submittedAttempts,
      totalReports,
      pendingReports,
      resolvedReports,
    ] = await Promise.all([
      this.prisma.client.user.count({ where: { deletedAt: null } }),
      this.prisma.client.user.count({ where: { isEmailVerified: true, deletedAt: null } }),
      this.prisma.client.question.count({ where: { deletedAt: null } }),
      this.prisma.client.question.count({ where: { status: QuestionStatus.PUBLISHED, deletedAt: null } }),
      this.prisma.client.question.count({ where: { status: QuestionStatus.IN_REVIEW, deletedAt: null } }),
      this.prisma.client.question.count({ where: { status: QuestionStatus.DRAFT, deletedAt: null } }),
      this.prisma.client.question.count({
        where: {
          OR: [
            { status: QuestionStatus.DRAFT_AI },
            { source: 'AI_SYNTHESIZER' },
          ],
          deletedAt: null,
        },
      }),
      this.prisma.client.pYQPaper.count(),
      this.prisma.client.pYQPaper.count({ where: { isPublished: true } }),
      this.prisma.client.test.count(),
      this.prisma.client.test.count({ where: { isPublished: true } }),
      this.prisma.client.testAttempt.count(),
      this.prisma.client.testAttempt.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.client.questionReport.count(),
      this.prisma.client.questionReport.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.client.questionReport.count({ where: { status: ReportStatus.RESOLVED } }),
    ]);

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
      },
      questions: {
        total: totalQuestions,
        published: publishedQuestions,
        inReview: inReviewQuestions,
        draft: draftQuestions,
        aiGenerated: aiDraftQuestions,
      },
      pyqPapers: {
        total: totalPyqs,
        published: publishedPyqs,
      },
      tests: {
        total: totalTests,
        published: publishedTests,
      },
      attempts: {
        total: totalAttempts,
        submitted: submittedAttempts,
        completionRatePercent: totalAttempts > 0 ? Math.round((submittedAttempts / totalAttempts) * 100) : 0,
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        resolved: resolvedReports,
      },
      aiMetrics: {
        totalAiQuestions: aiDraftQuestions,
      },
      system: platformSettings,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. USER MANAGEMENT & MODERATION
  // ---------------------------------------------------------------------------
  async listUsers(query: UserFilterQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.roles = {
        some: {
          role: { name: query.role },
        },
      };
    }

    if (query.academy) {
      where.targetAcademy = query.academy;
    }

    if (query.isVerified !== undefined) {
      where.isEmailVerified = String(query.isVerified) === 'true';
    }

    const [total, users] = await Promise.all([
      this.prisma.client.user.count({ where }),
      this.prisma.client.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          targetAcademy: true,
          isEmailVerified: true,
          currentStreak: true,
          highestStreak: true,
          lastActiveDate: true,
          createdAt: true,
          deletedAt: true,
          roles: { select: { role: { select: { name: true } } } },
          _count: {
            select: {
              attempts: true,
              practiceSessions: true,
              reports: true,
            },
          },
        },
      }),
    ]);

    return {
      items: users.map(u => ({
        ...u,
        isSuspended: !!u.deletedAt,
        roles: u.roles.map(r => r.role.name),
        attemptsCount: u._count.attempts,
        practiceSessionsCount: u._count.practiceSessions,
        reportsCount: u._count.reports,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        attempts: {
          take: 5,
          orderBy: { startedAt: 'desc' },
          include: { test: { select: { title: true, testType: true } } },
        },
        auditLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            attempts: true,
            practiceSessions: true,
            bookmarks: true,
            mistakes: true,
            reports: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      targetAcademy: user.targetAcademy,
      isEmailVerified: user.isEmailVerified,
      currentStreak: user.currentStreak,
      highestStreak: user.highestStreak,
      lastActiveDate: user.lastActiveDate,
      isSuspended: !!user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map(r => r.role.name),
      metrics: {
        totalAttempts: user._count.attempts,
        totalPracticeSessions: user._count.practiceSessions,
        totalBookmarks: user._count.bookmarks,
        totalMistakes: user._count.mistakes,
        totalReports: user._count.reports,
      },
      recentAttempts: user.attempts,
      recentAuditLogs: user.auditLogs,
    };
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateUserStatusDto,
    operatorId: string,
    ipAddress?: string,
  ) {
    const targetUser = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (userId === operatorId && dto.action === AccountModerationAction.SUSPEND) {
      throw new BadRequestException('Security violation: Staff officers cannot suspend their own account');
    }

    let updatedUser;
    if (dto.action === AccountModerationAction.SUSPEND) {
      updatedUser = await this.prisma.client.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });
    } else if (dto.action === AccountModerationAction.ACTIVATE) {
      updatedUser = await this.prisma.client.user.update({
        where: { id: userId },
        data: { deletedAt: null },
      });
    } else if (dto.action === AccountModerationAction.RESET_PASSWORD) {
      // Invalidate sessions
      updatedUser = await this.prisma.client.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
    }

    await this.auditService.logAction(
      operatorId,
      `USER_${dto.action}`,
      'User',
      userId,
      { reason: dto.reason, targetEmail: targetUser.email },
      ipAddress,
    );

    return {
      success: true,
      action: dto.action,
      userId,
      isSuspended: !!updatedUser?.deletedAt,
    };
  }

  async assignRole(
    userId: string,
    roleName: RoleType,
    operatorId: string,
    ipAddress?: string,
  ) {
    const role = await this.prisma.client.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleName} not found`);
    }

    const assignment = await this.prisma.client.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: role.id,
      },
    });

    await this.auditService.logAction(
      operatorId,
      'ASSIGN_ROLE',
      'User',
      userId,
      { assignedRole: roleName },
      ipAddress,
    );

    return assignment;
  }

  async revokeRole(
    userId: string,
    roleName: RoleType,
    operatorId: string,
    ipAddress?: string,
  ) {
    const role = await this.prisma.client.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleName} not found`);
    }

    // Safety: Prevent removing the only remaining Super Admin
    if (roleName === RoleType.SUPER_ADMIN) {
      const superAdminCount = await this.prisma.client.userRole.count({
        where: { roleId: role.id },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'Security Safeguard: Cannot revoke the last active SUPER_ADMIN role from the platform',
        );
      }
    }

    await this.prisma.client.userRole.deleteMany({
      where: {
        userId,
        roleId: role.id,
      },
    });

    await this.auditService.logAction(
      operatorId,
      'REVOKE_ROLE',
      'User',
      userId,
      { revokedRole: roleName },
      ipAddress,
    );

    return { success: true, revokedRole: roleName, userId };
  }

  // ---------------------------------------------------------------------------
  // 3. CANDIDATE QUESTION REPORTS MODERATION
  // ---------------------------------------------------------------------------
  async listReports(query: ReportFilterQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.client.questionReport.count({ where }),
      this.prisma.client.questionReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, fullName: true },
          },
          question: {
            select: {
              id: true,
              questionText: true,
              difficulty: true,
              status: true,
              subject: { select: { name: true } },
              chapter: { select: { name: true } },
              topic: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resolveReport(
    reportId: string,
    dto: ResolveReportDto,
    operatorId: string,
    ipAddress?: string,
  ) {
    const report = await this.prisma.client.questionReport.findUnique({
      where: { id: reportId },
      include: { question: true },
    });
    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    const newStatus =
      dto.action === ReportResolutionAction.RESOLVE
        ? ReportStatus.RESOLVED
        : ReportStatus.REJECTED;

    // Apply question remediation and republish if specified in workflow
    if (dto.questionFix && report.questionId) {
      const fix = dto.questionFix;
      const questionUpdateData: any = {};
      if (fix.questionText) questionUpdateData.questionText = fix.questionText;
      if (fix.republish) {
        questionUpdateData.status = QuestionStatus.PUBLISHED;
        questionUpdateData.verifiedAt = new Date();
        questionUpdateData.reviewedById = operatorId;
      }

      await this.prisma.client.$transaction(async (tx) => {
        if (Object.keys(questionUpdateData).length > 0) {
          await tx.question.update({
            where: { id: report.questionId },
            data: questionUpdateData,
          });
        }

        if (fix.options && fix.options.length > 0) {
          await tx.questionOption.deleteMany({ where: { questionId: report.questionId } });
          await tx.questionOption.createMany({
            data: fix.options.map((opt, idx) => ({
              questionId: report.questionId,
              identifier: opt.identifier,
              optionText: opt.optionText,
              isCorrect: Boolean(opt.isCorrect),
              orderIndex: idx,
            })),
          });
        }

        if (fix.explanation) {
          await tx.questionExplanation.upsert({
            where: { questionId: report.questionId },
            update: { explanation: fix.explanation },
            create: { questionId: report.questionId, explanation: fix.explanation },
          });
        }
      });
    }

    const updated = await this.prisma.client.questionReport.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        details: dto.notes
          ? `${report.details || ''}\n[Moderator Resolution]: ${dto.notes}`
          : report.details,
      },
    });

    await this.auditService.logAction(
      operatorId,
      `REPORT_${dto.action}`,
      'QuestionReport',
      reportId,
      {
        questionId: report.questionId,
        status: newStatus,
        notes: dto.notes,
        fixedAndRepublished: Boolean(dto.questionFix?.republish),
      },
      ipAddress,
    );

    return updated;
  }

  /**
   * Real-time Content Admin Dashboard metrics computed from database
   */
  async getContentDashboardStats(): Promise<ContentDashboardStats> {
    const [
      totalQuestions,
      published,
      drafts,
      pendingReview,
      reported,
      archived,
      rawPyqsByYear,
      questionsBySubjectRaw,
      questionsByTopicRaw,
      missingExplanationCount,
      allQuestionsWithOptions,
    ] = await Promise.all([
      this.prisma.client.question.count({ where: { deletedAt: null } }),
      this.prisma.client.question.count({
        where: { status: QuestionStatus.PUBLISHED, deletedAt: null },
      }),
      this.prisma.client.question.count({
        where: {
          status: { in: [QuestionStatus.DRAFT, QuestionStatus.DRAFT_AI] },
          deletedAt: null,
        },
      }),
      this.prisma.client.question.count({
        where: {
          status: { in: [QuestionStatus.REVIEW, QuestionStatus.IN_REVIEW] },
          deletedAt: null,
        },
      }),
      this.prisma.client.question.count({
        where: {
          reports: { some: { status: ReportStatus.PENDING } },
          deletedAt: null,
        },
      }),
      this.prisma.client.question.count({
        where: {
          OR: [{ status: QuestionStatus.ARCHIVED }, { deletedAt: { not: null } }],
        },
      }),
      this.prisma.client.pYQPaper.groupBy({
        by: ['year'],
        _count: { id: true },
        orderBy: { year: 'desc' },
      }),
      this.prisma.client.question.groupBy({
        by: ['subjectId'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.client.question.groupBy({
        by: ['topicId', 'subjectId'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.client.question.count({
        where: {
          explanation: null,
          deletedAt: null,
        },
      }),
      this.prisma.client.question.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          questionType: true,
          questionText: true,
          metadata: true,
          options: { select: { id: true } },
        },
      }),
    ]);

    const [subjects, topics] = await Promise.all([
      this.prisma.client.subject.findMany({ select: { id: true, name: true } }),
      this.prisma.client.topic.findMany({ select: { id: true, name: true, chapterId: true } }),
    ]);

    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
    const topicMap = new Map(topics.map((t) => [t.id, t.name]));

    const questionsBySubject = questionsBySubjectRaw.map((group) => ({
      subject: subjectMap.get(group.subjectId) || group.subjectId,
      count: group._count.id,
    }));

    const questionsByTopic = questionsByTopicRaw.map((group) => ({
      topic: topicMap.get(group.topicId) || group.topicId,
      subject: subjectMap.get(group.subjectId) || group.subjectId,
      count: group._count.id,
    }));

    const pyqsByYear = rawPyqsByYear.map((p) => ({
      year: p.year,
      count: p._count.id,
    }));

    let invalidOptionCount = 0;
    let unbalancedEquations = 0;
    let brokenImageReferences = 0;

    for (const q of allQuestionsWithOptions) {
      if (
        [
          QuestionType.MCQ_SINGLE,
          QuestionType.MCQ_MULTIPLE,
          QuestionType.ASSERTION_REASON,
          QuestionType.STATEMENT_BASED,
          QuestionType.MATCHING,
          QuestionType.IMAGE_BASED,
        ].includes(q.questionType as unknown as QuestionType) &&
        q.options.length < 2
      ) {
        invalidOptionCount++;
      }

      const doubleCount = (q.questionText.match(/(?<!\\)\$\$/g) || []).length;
      const textWithoutDouble = q.questionText.replace(/(?<!\\)\$\$/g, '');
      const singleCount = (textWithoutDouble.match(/(?<!\\)\$/g) || []).length;
      if (doubleCount % 2 !== 0 || singleCount % 2 !== 0) {
        unbalancedEquations++;
      }

      if (q.questionType === QuestionType.IMAGE_BASED) {
        const meta = q.metadata as Record<string, any> | null;
        const hasUrl = meta?.imageUrl || meta?.image;
        const hasMarkdown = /!\[.*?\]\(.*?\)/.test(q.questionText);
        if (!hasUrl && !hasMarkdown) {
          brokenImageReferences++;
        }
      }
    }

    return {
      totalQuestions,
      published,
      drafts,
      pendingReview,
      reported,
      archived,
      pyqsByYear,
      questionsBySubject,
      questionsByTopic,
      qualityIssues: {
        missingExplanation: missingExplanationCount,
        invalidOptionCount,
        unbalancedEquations,
        brokenImageReferences,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 4. TAXONOMY MANAGEMENT (SUBJECTS, CHAPTERS, TOPICS)
  // ---------------------------------------------------------------------------
  async listTaxonomy() {
    return this.prisma.client.subject.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        chapters: {
          orderBy: { orderIndex: 'asc' },
          include: {
            topics: {
              orderBy: { orderIndex: 'asc' },
              include: {
                _count: { select: { questions: true } },
              },
            },
            _count: { select: { questions: true } },
          },
        },
        _count: { select: { questions: true, pyqPapers: true } },
      },
    });
  }

  async createSubject(
    dto: CreateSubjectAdminDto,
    operatorId: string,
    ipAddress?: string,
  ) {
    const existing = await this.prisma.client.subject.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Subject with slug "${dto.slug}" already exists`);
    }

    const subject = await this.prisma.client.subject.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        orderIndex: dto.orderIndex ?? 0,
      },
    });

    await this.auditService.logAction(
      operatorId,
      'CREATE_SUBJECT',
      'Subject',
      subject.id,
      { slug: dto.slug, name: dto.name },
      ipAddress,
    );

    return subject;
  }

  async createChapter(
    dto: CreateChapterAdminDto,
    operatorId: string,
    ipAddress?: string,
  ) {
    const chapter = await this.prisma.client.chapter.create({
      data: {
        subjectId: dto.subjectId,
        name: dto.name,
        slug: dto.slug,
        orderIndex: dto.orderIndex ?? 0,
      },
    });

    await this.auditService.logAction(
      operatorId,
      'CREATE_CHAPTER',
      'Chapter',
      chapter.id,
      { subjectId: dto.subjectId, name: dto.name, slug: dto.slug },
      ipAddress,
    );

    return chapter;
  }

  async createTopic(
    dto: CreateTopicAdminDto,
    operatorId: string,
    ipAddress?: string,
  ) {
    const topic = await this.prisma.client.topic.create({
      data: {
        chapterId: dto.chapterId,
        name: dto.name,
        slug: dto.slug,
        orderIndex: dto.orderIndex ?? 0,
      },
    });

    await this.auditService.logAction(
      operatorId,
      'CREATE_TOPIC',
      'Topic',
      topic.id,
      { chapterId: dto.chapterId, name: dto.name, slug: dto.slug },
      ipAddress,
    );

    return topic;
  }

  // ---------------------------------------------------------------------------
  // 5. TEST BUILDER PRE-PUBLISH VALIDATION
  // ---------------------------------------------------------------------------
  async validateAndPublishTest(
    testId: string,
    operatorId: string,
    ipAddress?: string,
  ) {
    const test = await this.prisma.client.test.findUnique({
      where: { id: testId },
      include: {
        sections: {
          include: {
            testQuestions: {
              include: {
                question: { select: { id: true, marks: true, status: true } },
              },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${testId} not found`);
    }

    const validationErrors: string[] = [];

    // 1. Duration validation
    if (test.durationMinutes <= 0) {
      validationErrors.push('Test duration must be greater than 0 minutes.');
    }

    // 2. Instructions validation
    if (!test.instructions || test.instructions.trim().length === 0) {
      validationErrors.push('Official examination candidate instructions are required before publishing.');
    }

    // 3. Section count validation
    if (!test.sections || test.sections.length === 0) {
      validationErrors.push('Test must contain at least 1 section.');
    }

    // 4. Questions assigned validation
    let totalAssignedQuestions = 0;
    let totalAssignedMarks = 0;

    for (const section of test.sections) {
      const qCount = section.testQuestions.length;
      totalAssignedQuestions += qCount;
      if (qCount === 0) {
        validationErrors.push(`Section "${section.name}" has 0 questions assigned.`);
      }

      for (const tq of section.testQuestions) {
        totalAssignedMarks += Number(tq.question.marks || 1);
        if (tq.question.status !== QuestionStatus.PUBLISHED) {
          validationErrors.push(
            `Question ID ${tq.question.id} in section "${section.name}" is ${tq.question.status} (must be PUBLISHED).`,
          );
        }
      }
    }

    if (totalAssignedQuestions === 0) {
      validationErrors.push('Test has no questions assigned to any section.');
    }

    // 5. Marks consistency check
    const configuredTotalMarks = Number(test.totalMarks);
    if (Math.abs(configuredTotalMarks - totalAssignedMarks) > 0.05) {
      validationErrors.push(
        `Marks mismatch: Configured totalMarks (${configuredTotalMarks}) does not equal the sum of assigned question marks (${totalAssignedMarks}).`,
      );
    }

    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Test pre-publication validation failed',
        errors: validationErrors,
      });
    }

    const updated = await this.prisma.client.test.update({
      where: { id: testId },
      data: { isPublished: true },
    });

    await this.auditService.logAction(
      operatorId,
      'PUBLISH_TEST',
      'Test',
      testId,
      { title: test.title, totalQuestions: totalAssignedQuestions, totalMarks: configuredTotalMarks },
      ipAddress,
    );

    return {
      success: true,
      testId,
      title: test.title,
      isPublished: true,
      validationPassed: true,
      totalQuestions: totalAssignedQuestions,
      totalMarks: configuredTotalMarks,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. AI MODERATION & BATCH APPROVAL
  // ---------------------------------------------------------------------------
  async listAiModeration(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where = {
      OR: [
        { status: QuestionStatus.DRAFT_AI },
        { source: 'AI_SYNTHESIZER' },
        { status: QuestionStatus.DRAFT },
      ],
      deletedAt: null,
    };

    const [total, questions] = await Promise.all([
      this.prisma.client.question.count({ where }),
      this.prisma.client.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          explanation: true,
          subject: { select: { id: true, name: true } },
          chapter: { select: { id: true, name: true } },
          topic: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items: questions.map(q => ({
        ...q,
        isAiGenerated: q.source === 'AI_SYNTHESIZER' || q.status === QuestionStatus.DRAFT_AI,
        validationStatus: q.metadata ? (q.metadata as Record<string, unknown>).verificationStatus || 'VERIFIED' : 'VERIFIED',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async batchApproveAiQuestions(
    dto: BatchApproveAiQuestionsDto,
    operatorId: string,
    ipAddress?: string,
  ) {
    const targetStatus = dto.targetStatus || QuestionStatus.APPROVED;

    const result = await this.prisma.client.question.updateMany({
      where: {
        id: { in: dto.questionIds },
      },
      data: {
        status: targetStatus,
      },
    });

    await this.auditService.logAction(
      operatorId,
      'BATCH_APPROVE_AI_QUESTIONS',
      'Question',
      dto.questionIds.join(','),
      { count: result.count, targetStatus, questionIds: dto.questionIds },
      ipAddress,
    );

    return {
      success: true,
      approvedCount: result.count,
      targetStatus,
      questionIds: dto.questionIds,
    };
  }

  // ---------------------------------------------------------------------------
  // 7. SYSTEM SETTINGS
  // ---------------------------------------------------------------------------
  getSystemSettings() {
    return platformSettings;
  }

  async updateSystemSettings(
    dto: UpdateSystemSettingsDto,
    operatorId: string,
    ipAddress?: string,
  ) {
    platformSettings = {
      ...platformSettings,
      ...(dto.maintenanceMode !== undefined ? { maintenanceMode: dto.maintenanceMode } : {}),
      ...(dto.defaultNegativeMarking !== undefined ? { defaultNegativeMarking: dto.defaultNegativeMarking } : {}),
      ...(dto.timerGracePeriodSeconds !== undefined ? { timerGracePeriodSeconds: dto.timerGracePeriodSeconds } : {}),
      ...(dto.aiDailyGenerationLimit !== undefined ? { aiDailyGenerationLimit: dto.aiDailyGenerationLimit } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: operatorId,
    };

    await this.auditService.logAction(
      operatorId,
      'UPDATE_SYSTEM_SETTINGS',
      'SystemSettings',
      'GLOBAL',
      platformSettings,
      ipAddress,
    );

    return platformSettings;
  }

  // Legacy compatibility method
  async updateQuestionStatus(questionId: string, status: QuestionStatus, operatorId?: string) {
    const updated = await this.prisma.client.question.update({
      where: { id: questionId },
      data: { status },
    });

    if (operatorId) {
      await this.auditService.logAction(
        operatorId,
        'UPDATE_QUESTION_STATUS',
        'Question',
        questionId,
        { newStatus: status },
      );
    }

    return updated;
  }
}
