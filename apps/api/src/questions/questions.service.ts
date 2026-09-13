import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DifficultyLevel, QuestionStatus, QuestionType, RoleType } from '@cdsprep/types';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionQueryDto,
  BulkImportDto,
} from './dto/questions.dto';

export interface QuestionFilterParams extends QuestionQueryDto {
  isAdmin?: boolean;
}

export interface BulkImportRowError {
  row: number;
  question?: string;
  field?: string;
  issue: string;
}

export interface BulkImportDryRunResult {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  errors: BulkImportRowError[];
  warnings?: string[];
  validPreview: Array<{
    questionText: string;
    subject: string;
    topic: string;
    questionType: QuestionType;
    difficulty: DifficultyLevel;
  }>;
}

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Filter and list questions with multi-faceted filtering & pagination
   */
  async findAll(filters: QuestionFilterParams) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.chapterId ? { chapterId: filters.chapterId } : {}),
      ...(filters.topicId ? { topicId: filters.topicId } : {}),
      ...(filters.subtopicId ? { subtopicId: filters.subtopicId } : {}),
      ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
      ...(filters.questionType ? { questionType: filters.questionType } : {}),
      ...(filters.year ? { year: Number(filters.year) } : {}),
      ...(filters.exam ? { exam: { contains: filters.exam, mode: 'insensitive' } } : {}),
    };

    // Practice mode only returns PUBLISHED questions; Admin can see any requested status
    if (filters.isAdmin) {
      if (filters.status) {
        where.status = filters.status;
      }
    } else {
      where.status = QuestionStatus.PUBLISHED;
    }

    if (filters.search) {
      where.OR = [
        { questionText: { contains: filters.search, mode: 'insensitive' } },
        { source: { contains: filters.search, mode: 'insensitive' } },
        {
          tagMaps: {
            some: {
              tag: { name: { contains: filters.search, mode: 'insensitive' } },
            },
          },
        },
      ];
    }

    const [total, rawItems] = await Promise.all([
      this.prisma.client.question.count({ where }),
      this.prisma.client.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          options: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              identifier: true,
              optionText: true,
              isCorrect: filters.isAdmin ? true : false,
              orderIndex: true,
            },
          },
          explanation: filters.isAdmin
            ? { select: { id: true, explanation: true, keyConcept: true, trickFormula: true } }
            : false,
          subject: { select: { id: true, name: true, slug: true } },
          chapter: { select: { id: true, name: true, slug: true } },
          topic: { select: { id: true, name: true, slug: true } },
          subtopic: { select: { id: true, name: true, slug: true } },
          tagMaps: {
            include: {
              tag: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const items = rawItems.map((q) => ({
      ...q,
      marks: Number(q.marks),
      negativeMarks: Number(q.negativeMarks),
      tags: q.tagMaps?.map((tm) => tm.tag.name) || [],
    }));

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

  /**
   * Get single question with full solution and options
   */
  async findOneWithSolution(id: string) {
    const question = await this.prisma.client.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        explanation: true,
        subject: true,
        chapter: true,
        topic: true,
        subtopic: true,
        tagMaps: {
          include: { tag: true },
        },
      },
    });

    if (!question || question.deletedAt) {
      throw new NotFoundException(`Question with id "${id}" not found`);
    }

    return {
      ...question,
      marks: Number(question.marks),
      negativeMarks: Number(question.negativeMarks),
      tags: question.tagMaps?.map((tm) => tm.tag.name) || [],
    };
  }

  /**
   * Get single question details by ID
   */
  async findOne(id: string) {
    return this.findOneWithSolution(id);
  }

  /**
   * Validate relational integrity between Subject, Chapter, Topic, and Subtopic
   */
  async validateHierarchy(
    subjectId: string,
    chapterId: string,
    topicId: string,
    subtopicId?: string,
  ) {
    const [subject, chapter, topic, subtopic] = await Promise.all([
      this.prisma.client.subject.findUnique({ where: { id: subjectId } }),
      this.prisma.client.chapter.findUnique({ where: { id: chapterId } }),
      this.prisma.client.topic.findUnique({ where: { id: topicId } }),
      subtopicId ? this.prisma.client.subtopic.findUnique({ where: { id: subtopicId } }) : null,
    ]);

    if (!subject) {
      throw new BadRequestException(`Subject with id "${subjectId}" does not exist`);
    }
    if (!chapter) {
      throw new BadRequestException(`Chapter with id "${chapterId}" does not exist`);
    }
    if (chapter.subjectId !== subjectId) {
      throw new BadRequestException(
        `Chapter "${chapter.name}" does not belong to subject "${subject.name}"`,
      );
    }
    if (!topic) {
      throw new BadRequestException(`Topic with id "${topicId}" does not exist`);
    }
    if (topic.chapterId !== chapterId) {
      throw new BadRequestException(
        `Topic "${topic.name}" does not belong to chapter "${chapter.name}"`,
      );
    }
    if (subtopicId && (!subtopic || subtopic.topicId !== topicId)) {
      throw new BadRequestException(
        `Subtopic with id "${subtopicId}" does not belong to topic "${topic.name}"`,
      );
    }

    return { subject, chapter, topic, subtopic };
  }

  /**
   * Normalize question text for duplicate detection
   */
  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\s\r\n\t]+/g, ' ')
      .replace(/[^\w\s\d]/g, '')
      .trim();
  }

  /**
   * Check for duplicate question within topic or subject
   */
  async checkDuplicate(questionText: string, topicId: string, excludeId?: string) {
    const normalizedInput = this.normalizeText(questionText);
    const existingQuestions = await this.prisma.client.question.findMany({
      where: {
        topicId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, questionText: true },
    });

    const duplicate = existingQuestions.find(
      (q) => this.normalizeText(q.questionText) === normalizedInput,
    );
    return duplicate || null;
  }

  /**
   * Create question with quality controls and audit logging
   */
  async create(dto: CreateQuestionDto, user?: AuthenticatedUser) {
    // 1. Hierarchy verification
    await this.validateHierarchy(dto.subjectId, dto.chapterId, dto.topicId, dto.subtopicId);

    // Phase 20 Rule 3: Only APPROVED content can become PUBLISHED.
    if (dto.status === QuestionStatus.PUBLISHED) {
      throw new BadRequestException(
        'New questions cannot be directly created with PUBLISHED status. Content must follow DRAFT -> REVIEW -> APPROVED -> PUBLISHED workflow.',
      );
    }

    // 2. Duplicate detection
    const isDuplicate = await this.checkDuplicate(dto.questionText, dto.topicId);
    if (isDuplicate) {
      throw new BadRequestException(
        `Duplicate question detected: identical question already exists in this topic (ID: ${isDuplicate.id})`,
      );
    }

    // 3. Marks validation
    const marks = dto.marks ?? 1.0;
    const negativeMarks = dto.negativeMarks ?? 0.33;
    if (negativeMarks > marks) {
      throw new BadRequestException('Negative marks cannot exceed total marks');
    }

    // 4. Equation balance validation
    const validateDelimiters = (str: string, fieldName: string) => {
      const doubleCount = (str.match(/(?<!\\)\$\$/g) || []).length;
      if (doubleCount % 2 !== 0) {
        throw new BadRequestException(`Malformed equation in ${fieldName}: unclosed display math delimiter "$$"`);
      }
      const strWithoutDouble = str.replace(/(?<!\\)\$\$/g, '');
      const singleCount = (strWithoutDouble.match(/(?<!\\)\$/g) || []).length;
      if (singleCount % 2 !== 0) {
        throw new BadRequestException(`Malformed equation in ${fieldName}: unclosed inline math delimiter "$"`);
      }
    };

    if (dto.questionText) {
      validateDelimiters(dto.questionText, 'questionText');
    }
    if (dto.explanation?.explanation) {
      validateDelimiters(dto.explanation.explanation, 'explanation');
    }

    // 5. Options and correct answer validation
    const qType = dto.questionType || QuestionType.MCQ_SINGLE;
    const options = dto.options || [];

    const choiceTypes = [
      QuestionType.MCQ_SINGLE,
      QuestionType.MCQ_MULTIPLE,
      QuestionType.ASSERTION_REASON,
      QuestionType.STATEMENT_BASED,
      QuestionType.MATCHING,
      QuestionType.IMAGE_BASED,
    ];

    if (choiceTypes.includes(qType)) {
      if (options.length < 2) {
        throw new BadRequestException(`${qType} question requires at least 2 options`);
      }
      const correctOpts = options.filter((o) => o.isCorrect);
      if (correctOpts.length === 0) {
        throw new BadRequestException('At least one option must be designated as the correct answer');
      }
      if (
        (qType === QuestionType.MCQ_SINGLE || qType === QuestionType.IMAGE_BASED) &&
        correctOpts.length > 1
      ) {
        throw new BadRequestException('Single-choice MCQ must have exactly one correct option');
      }
    } else if (qType === QuestionType.NUMERICAL) {
      const hasOptionCorrect = options.some((o) => o.isCorrect);
      const hasMetaVal =
        dto.metadata &&
        (dto.metadata.correctValue !== undefined || dto.metadata.numericalAnswer !== undefined);
      if (!hasOptionCorrect && !hasMetaVal) {
        throw new BadRequestException(
          'Numerical question must specify a correct numerical value in metadata or options',
        );
      }
    }

    if (qType === QuestionType.IMAGE_BASED) {
      const hasImg =
        dto.metadata &&
        (typeof dto.metadata.imageUrl === 'string' || typeof dto.metadata.image === 'string');
      const hasMarkdownImg = /!\[.*?\]\(.*?\)/.test(dto.questionText);
      if (!hasImg && !hasMarkdownImg) {
        throw new BadRequestException(
          'Image-based question must specify a valid imageUrl in metadata or embedded image in question text',
        );
      }
    }

    // 6. Database transaction for question creation
    const question = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.question.create({
        data: {
          subjectId: dto.subjectId,
          chapterId: dto.chapterId,
          topicId: dto.topicId,
          subtopicId: dto.subtopicId || null,
          questionType: qType,
          questionText: dto.questionText,
          marks,
          negativeMarks,
          difficulty: dto.difficulty || DifficultyLevel.MEDIUM,
          status: dto.status || QuestionStatus.DRAFT,
          source: dto.source,
          year: dto.year ? Number(dto.year) : null,
          exam: dto.exam,
          language: dto.language || 'en',
          metadata: dto.metadata ? dto.metadata : undefined,
          createdById: user?.id,
          options: {
            create: options.map((opt, idx) => ({
              identifier: opt.identifier,
              optionText: opt.optionText,
              isCorrect: Boolean(opt.isCorrect),
              orderIndex: opt.orderIndex ?? idx,
            })),
          },
          ...(dto.explanation
            ? {
                explanation: {
                  create: {
                    explanation: dto.explanation.explanation,
                    keyConcept: dto.explanation.keyConcept,
                    trickFormula: dto.explanation.trickFormula,
                  },
                },
              }
            : {}),
        },
        include: {
          options: true,
          explanation: true,
          subtopic: true,
        },
      });

      // Tags mapping
      if (dto.tags && dto.tags.length > 0) {
        for (const tagName of dto.tags) {
          const trimmed = tagName.trim();
          if (!trimmed) continue;
          const tag = await tx.questionTag.upsert({
            where: { name: trimmed },
            update: {},
            create: { name: trimmed },
          });
          await tx.questionTagMap.upsert({
            where: {
              questionId_tagId: {
                questionId: created.id,
                tagId: tag.id,
              },
            },
            update: {},
            create: {
              questionId: created.id,
              tagId: tag.id,
            },
          });
        }
      }

      return created;
    });

    // 6. Security Audit Log
    await this.auditService.logAction(
      user?.id || null,
      'question:create',
      'QUESTION',
      question.id,
      {
        questionText: question.questionText.slice(0, 100),
        status: question.status,
        questionType: question.questionType,
        subjectId: question.subjectId,
      },
    );

    return this.findOne(question.id);
  }

  /**
   * Update question with production lock validation and audit log
   */
  async update(id: string, dto: UpdateQuestionDto, user: AuthenticatedUser) {
    const existing = await this.prisma.client.question.findUnique({
      where: { id },
      include: { options: true, explanation: true },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Question with id "${id}" not found`);
    }

    // Security check: Only CONTENT_MANAGER, ADMIN, or SUPER_ADMIN can modify production (PUBLISHED) questions
    const isProduction = existing.status === QuestionStatus.PUBLISHED;
    const isContentManagerOrAbove =
      user.roles.includes(RoleType.SUPER_ADMIN) ||
      user.roles.includes(RoleType.ADMIN) ||
      user.roles.includes(RoleType.CONTENT_MANAGER);

    if (isProduction && !isContentManagerOrAbove) {
      throw new ForbiddenException(
        'Access denied: Only authorized Content Managers can modify production (published) questions',
      );
    }

    // Hierarchy validation if any hierarchy field is updated
    const targetSubjectId = dto.subjectId || existing.subjectId;
    const targetChapterId = dto.chapterId || existing.chapterId;
    const targetTopicId = dto.topicId || existing.topicId;

    if (dto.subjectId || dto.chapterId || dto.topicId) {
      await this.validateHierarchy(targetSubjectId, targetChapterId, targetTopicId);
    }

    // Duplicate check if question text or topic changed
    if (dto.questionText && dto.questionText !== existing.questionText) {
      const duplicate = await this.checkDuplicate(dto.questionText, targetTopicId, id);
      if (duplicate) {
        throw new BadRequestException(
          `Duplicate question detected: identical question already exists in this topic (ID: ${duplicate.id})`,
        );
      }
    }

    // Database transaction
    const updated = await this.prisma.client.$transaction(async (tx) => {
      // If options are provided, replace them
      if (dto.options) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
        await tx.questionOption.createMany({
          data: dto.options.map((opt, idx) => ({
            questionId: id,
            identifier: opt.identifier,
            optionText: opt.optionText,
            isCorrect: Boolean(opt.isCorrect),
            orderIndex: opt.orderIndex ?? idx,
          })),
        });
      }

      // If explanation is provided, upsert
      if (dto.explanation) {
        await tx.questionExplanation.upsert({
          where: { questionId: id },
          update: {
            explanation: dto.explanation.explanation,
            keyConcept: dto.explanation.keyConcept,
            trickFormula: dto.explanation.trickFormula,
          },
          create: {
            questionId: id,
            explanation: dto.explanation.explanation,
            keyConcept: dto.explanation.keyConcept,
            trickFormula: dto.explanation.trickFormula,
          },
        });
      }

      // Update tags if provided
      if (dto.tags) {
        await tx.questionTagMap.deleteMany({ where: { questionId: id } });
        for (const tagName of dto.tags) {
          const trimmed = tagName.trim();
          if (!trimmed) continue;
          const tag = await tx.questionTag.upsert({
            where: { name: trimmed },
            update: {},
            create: { name: trimmed },
          });
          await tx.questionTagMap.create({
            data: { questionId: id, tagId: tag.id },
          });
        }
      }

      if (dto.status === QuestionStatus.PUBLISHED && existing.status !== QuestionStatus.APPROVED) {
        throw new BadRequestException(
          `Invalid status transition: Only APPROVED content can become PUBLISHED (current status: ${existing.status})`,
        );
      }

      return tx.question.update({
        where: { id },
        data: {
          ...(dto.questionText ? { questionText: dto.questionText } : {}),
          ...(dto.subjectId ? { subjectId: dto.subjectId } : {}),
          ...(dto.chapterId ? { chapterId: dto.chapterId } : {}),
          ...(dto.topicId ? { topicId: dto.topicId } : {}),
          ...(dto.subtopicId !== undefined ? { subtopicId: dto.subtopicId } : {}),
          ...(dto.questionType ? { questionType: dto.questionType } : {}),
          ...(dto.marks !== undefined ? { marks: dto.marks } : {}),
          ...(dto.negativeMarks !== undefined ? { negativeMarks: dto.negativeMarks } : {}),
          ...(dto.difficulty ? { difficulty: dto.difficulty } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.source !== undefined ? { source: dto.source } : {}),
          ...(dto.year !== undefined ? { year: dto.year ? Number(dto.year) : null } : {}),
          ...(dto.exam !== undefined ? { exam: dto.exam } : {}),
          ...(dto.language ? { language: dto.language } : {}),
          ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
          ...(dto.reviewedById !== undefined ? { reviewedById: dto.reviewedById } : {}),
          ...(dto.verifiedAt !== undefined ? { verifiedAt: dto.verifiedAt } : {}),
        },
      });
    });

    // Audit log
    await this.auditService.logAction(user.id, 'question:update', 'QUESTION', id, {
      updatedFields: Object.keys(dto),
      status: updated.status,
    });

    return this.findOne(id);
  }

  /**
   * Transition question status with role verification and strict state-machine workflow
   */
  async updateStatus(
    id: string,
    newStatus: QuestionStatus,
    user: AuthenticatedUser,
    reason?: string,
  ) {
    const existing = await this.prisma.client.question.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Question with id "${id}" not found`);
    }

    const isContentManagerOrAbove =
      user.roles.includes(RoleType.SUPER_ADMIN) ||
      user.roles.includes(RoleType.ADMIN) ||
      user.roles.includes(RoleType.CONTENT_MANAGER);

    // Publishing or archiving or approving requires Content Manager or Admin privileges
    const restrictedStatuses: QuestionStatus[] = [
      QuestionStatus.PUBLISHED,
      QuestionStatus.ARCHIVED,
      QuestionStatus.APPROVED,
    ];

    if (restrictedStatuses.includes(newStatus) && !isContentManagerOrAbove) {
      throw new ForbiddenException(
        `Access denied: Only Content Managers and Administrators can set status to ${newStatus}`,
      );
    }

    const currentStatus = existing.status;
    if (currentStatus === newStatus) {
      return existing;
    }

    // Phase 20 Rule 3: Only APPROVED content can become PUBLISHED.
    if (newStatus === QuestionStatus.PUBLISHED && currentStatus !== QuestionStatus.APPROVED) {
      throw new BadRequestException(
        `Invalid status transition: Only APPROVED content can become PUBLISHED (current status is "${currentStatus}")`,
      );
    }

    // State machine transitions
    const allowedTransitions: Record<string, QuestionStatus[]> = {
      [QuestionStatus.DRAFT]: [QuestionStatus.REVIEW, QuestionStatus.IN_REVIEW, QuestionStatus.ARCHIVED],
      [QuestionStatus.DRAFT_AI]: [QuestionStatus.REVIEW, QuestionStatus.IN_REVIEW, QuestionStatus.ARCHIVED],
      [QuestionStatus.REVIEW]: [QuestionStatus.APPROVED, QuestionStatus.DRAFT, QuestionStatus.ARCHIVED],
      [QuestionStatus.IN_REVIEW]: [QuestionStatus.APPROVED, QuestionStatus.DRAFT, QuestionStatus.ARCHIVED],
      [QuestionStatus.APPROVED]: [QuestionStatus.PUBLISHED, QuestionStatus.DRAFT, QuestionStatus.ARCHIVED],
      [QuestionStatus.PUBLISHED]: [QuestionStatus.ARCHIVED, QuestionStatus.DRAFT],
      [QuestionStatus.ARCHIVED]: [QuestionStatus.DRAFT],
    };

    const validTargets = allowedTransitions[currentStatus] || [QuestionStatus.ARCHIVED];
    if (!validTargets.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition: Cannot change question status from "${currentStatus}" to "${newStatus}"`,
      );
    }

    const dataToUpdate: any = { status: newStatus };
    if (newStatus === QuestionStatus.APPROVED) {
      dataToUpdate.reviewedById = user.id;
      dataToUpdate.verifiedAt = new Date();
    }

    const updated = await this.prisma.client.question.update({
      where: { id },
      data: dataToUpdate,
    });

    // Audit log
    await this.auditService.logAction(user.id, 'question:status_change', 'QUESTION', id, {
      previousStatus: existing.status,
      newStatus,
      reason,
      reviewedById: dataToUpdate.reviewedById,
      verifiedAt: dataToUpdate.verifiedAt,
    });

    return updated;
  }

  /**
   * Soft-delete / Archive question
   */
  async archive(id: string, user: AuthenticatedUser) {
    return this.updateStatus(id, QuestionStatus.ARCHIVED, user, 'Archived via admin action');
  }

  /**
   * Soft-delete question
   */
  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.client.question.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Question with id "${id}" not found`);
    }

    const isContentManagerOrAbove =
      user.roles.includes(RoleType.SUPER_ADMIN) ||
      user.roles.includes(RoleType.ADMIN) ||
      user.roles.includes(RoleType.CONTENT_MANAGER);

    if (existing.status === QuestionStatus.PUBLISHED && !isContentManagerOrAbove) {
      throw new ForbiddenException('Only Content Managers can delete published production questions');
    }

    const deleted = await this.prisma.client.question.update({
      where: { id },
      data: { deletedAt: new Date(), status: QuestionStatus.ARCHIVED },
    });

    await this.auditService.logAction(user.id, 'question:delete', 'QUESTION', id, {
      questionText: existing.questionText.slice(0, 100),
    });

    return deleted;
  }

  /**
   * Parse CSV string into row objects
   */
  parseCsv(csvContent: string): any[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return [];
    }

    // Simple robust CSV line splitter honoring double quotes
    const splitCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuote = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = splitCsvLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ''),
    );

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = splitCsvLine(lines[i]);
      const rowObj: Record<string, any> = {};
      headers.forEach((header, idx) => {
        rowObj[header] = values[idx] !== undefined ? values[idx] : '';
      });
      rows.push(rowObj);
    }

    return rows;
  }

  /**
   * Bulk Import Dry-Run Validation
   * Checks required fields, option counts, correct answer presence,
   * subject/chapter/topic relationships, and duplicate detection.
   */
  /**
   * Bulk Import Dry-Run Validation
   * Checks required fields, option counts, correct answer presence,
   * subject/chapter/topic/subtopic relationships, equations, images, and duplicate detection.
   */
  async validateBulkImport(dto: BulkImportDto): Promise<BulkImportDryRunResult> {
    let rawRows: any[] = [];

    if (dto.csvContent && dto.csvContent.trim().length > 0) {
      const trimmed = dto.csvContent.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          rawRows = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          rawRows = this.parseCsv(dto.csvContent);
        }
      } else {
        rawRows = this.parseCsv(dto.csvContent);
      }
    } else if (Array.isArray(dto.data)) {
      rawRows = dto.data;
    } else if (Array.isArray((dto as any)?.questions)) {
      rawRows = (dto as any).questions;
    } else if (Array.isArray(dto)) {
      rawRows = dto;
    }

    const total = rawRows.length;
    const errors: BulkImportRowError[] = [];
    const warnings: string[] = [];
    let valid = 0;
    let invalid = 0;
    let duplicates = 0;
    const validPreview: any[] = [];

    if (total === 0) {
      return { total: 0, valid: 0, invalid: 0, duplicates: 0, errors, warnings, validPreview };
    }

    // Cache existing taxonomy in memory for fast row validation
    const [allSubjects, allChapters, allTopics, allSubtopics, existingQuestions] = await Promise.all([
      this.prisma.client.subject.findMany(),
      this.prisma.client.chapter.findMany(),
      this.prisma.client.topic.findMany(),
      this.prisma.client.subtopic ? this.prisma.client.subtopic.findMany() : Promise.resolve([]),
      this.prisma.client.question.findMany({
        where: { deletedAt: null },
        select: { id: true, questionText: true, topicId: true },
      }),
    ]);

    const seenInBatch = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 1;
      let rowHasError = false;

      // Map flexible fields (support both camelCase and lowercase/stripped headers)
      const questionText = (
        row.questionText ||
        row.questiontext ||
        row.question ||
        row.text ||
        ''
      ).trim();
      const subjectNameOrSlug = (
        row.subject ||
        row.subjectId ||
        row.subjectid ||
        row.subjectSlug ||
        row.subjectslug ||
        ''
      ).trim();
      const chapterNameOrSlug = (
        row.chapter ||
        row.chapterId ||
        row.chapterid ||
        row.chapterSlug ||
        row.chapterslug ||
        ''
      ).trim();
      const topicNameOrSlug = (
        row.topic ||
        row.topicId ||
        row.topicid ||
        row.topicSlug ||
        row.topicslug ||
        ''
      ).trim();
      const subtopicNameOrSlug = (
        row.subtopic ||
        row.subtopicId ||
        row.subtopicid ||
        row.subtopicSlug ||
        row.subtopicslug ||
        ''
      ).trim();
      const questionTypeStr = (
        row.questionType ||
        row.questiontype ||
        row.type ||
        'MCQ_SINGLE'
      )
        .trim()
        .toUpperCase();
      const difficultyStr = (row.difficulty || 'MEDIUM').trim().toUpperCase();
      const rawOptions = row.options;
      const rawCorrectAnswer = (
        row.correctAnswer ||
        row.correctanswer ||
        row.correct ||
        ''
      ).trim();

      // 1. Required fields check
      if (!questionText || questionText.length < 3) {
        errors.push({
          row: rowNumber,
          field: 'question',
          issue: 'Question text is required and must be at least 3 characters',
          question: questionText || undefined,
        });
        rowHasError = true;
      }

      // 2. Subject validation
      const matchedSubject = allSubjects.find(
        (s) =>
          s.id === subjectNameOrSlug ||
          s.slug.toLowerCase() === subjectNameOrSlug.toLowerCase() ||
          s.name.toLowerCase() === subjectNameOrSlug.toLowerCase(),
      );

      if (!matchedSubject) {
        errors.push({
          row: rowNumber,
          field: 'subject',
          issue: `Subject "${subjectNameOrSlug}" does not exist in syllabus`,
          question: questionText,
        });
        rowHasError = true;
      }

      // 3. Topic validation & relational integrity
      let matchedTopic = allTopics.find(
        (t) =>
          t.id === topicNameOrSlug ||
          t.slug.toLowerCase() === topicNameOrSlug.toLowerCase() ||
          t.name.toLowerCase() === topicNameOrSlug.toLowerCase(),
      );

      if (!matchedTopic) {
        errors.push({
          row: rowNumber,
          field: 'topic',
          issue: `Topic "${topicNameOrSlug}" does not exist in syllabus`,
          question: questionText,
        });
        rowHasError = true;
      } else if (matchedSubject) {
        const topicChapter = allChapters.find((c) => c.id === matchedTopic!.chapterId);
        if (!topicChapter || topicChapter.subjectId !== matchedSubject.id) {
          errors.push({
            row: rowNumber,
            field: 'hierarchy',
            issue: `Topic "${matchedTopic.name}" does not belong to Subject "${matchedSubject.name}"`,
            question: questionText,
          });
          rowHasError = true;
        }
      }

      // Optional Subtopic validation
      if (subtopicNameOrSlug && matchedTopic) {
        const matchedSubtopic = allSubtopics.find(
          (st: any) =>
            st.topicId === matchedTopic!.id &&
            (st.id === subtopicNameOrSlug ||
              st.slug.toLowerCase() === subtopicNameOrSlug.toLowerCase() ||
              st.name.toLowerCase() === subtopicNameOrSlug.toLowerCase()),
        );
        if (!matchedSubtopic) {
          warnings.push(`Row ${rowNumber}: Subtopic "${subtopicNameOrSlug}" not found under topic "${matchedTopic.name}". Will be imported without subtopic.`);
        }
      }

      // 4. Equation delimiter balance check
      const doubleCount = (questionText.match(/(?<!\\)\$\$/g) || []).length;
      const textWithoutDouble = questionText.replace(/(?<!\\)\$\$/g, '');
      const singleCount = (textWithoutDouble.match(/(?<!\\)\$/g) || []).length;
      if (doubleCount % 2 !== 0 || singleCount % 2 !== 0) {
        errors.push({
          row: rowNumber,
          field: 'questionText',
          issue: 'Malformed LaTeX formula: unclosed "$" or "$$" delimiter in question text',
          question: questionText,
        });
        rowHasError = true;
      }

      // 5. Duplicate question check
      const normalized = this.normalizeText(questionText);
      const isDuplicateInBatch = seenInBatch.has(normalized);
      const isDuplicateInDb =
        matchedTopic &&
        existingQuestions.some(
          (eq) =>
            eq.topicId === matchedTopic!.id && this.normalizeText(eq.questionText) === normalized,
        );

      if (isDuplicateInBatch || isDuplicateInDb) {
        duplicates++;
        errors.push({
          row: rowNumber,
          field: 'duplicate',
          issue: isDuplicateInBatch
            ? 'Duplicate question detected within the current import file'
            : 'Duplicate question already exists in the question bank',
          question: questionText,
        });
        rowHasError = true;
      } else {
        seenInBatch.add(normalized);
      }

      // 6. Options and answer validation
      let parsedOptions: any[] = [];
      if (Array.isArray(rawOptions)) {
        parsedOptions = rawOptions;
      } else if (typeof rawOptions === 'string' && rawOptions.trim().length > 0) {
        if (rawOptions.trim().startsWith('[')) {
          try {
            parsedOptions = JSON.parse(rawOptions);
          } catch {
            parsedOptions = [];
          }
        } else {
          const parts = rawOptions.split('|').map((p) => p.trim());
          parsedOptions = parts.map((part, idx) => {
            const match = part.match(/^([A-Da-d0-9]+)[:\.)\s]+(.+)$/);
            const ident = match ? match[1].toUpperCase() : String.fromCharCode(65 + idx);
            const text = match ? match[2].trim() : part;
            const isCorr = rawCorrectAnswer
              ? rawCorrectAnswer.toUpperCase().includes(ident)
              : false;
            return { identifier: ident, optionText: text, isCorrect: isCorr };
          });
        }
      }

      const qType =
        (QuestionType as any)[questionTypeStr] ||
        (questionTypeStr === 'MCQ' ? QuestionType.MCQ_SINGLE : QuestionType.MCQ_SINGLE);

      if (
        [
          QuestionType.MCQ_SINGLE,
          QuestionType.MCQ_MULTIPLE,
          QuestionType.ASSERTION_REASON,
          QuestionType.STATEMENT_BASED,
          QuestionType.MATCHING,
          QuestionType.IMAGE_BASED,
        ].includes(qType)
      ) {
        if (parsedOptions.length < 2) {
          errors.push({
            row: rowNumber,
            field: 'options',
            issue: `Question requires at least 2 options, found ${parsedOptions.length}`,
            question: questionText,
          });
          rowHasError = true;
        } else {
          const hasCorrect = parsedOptions.some((o) => o.isCorrect);
          if (!hasCorrect) {
            errors.push({
              row: rowNumber,
              field: 'correctAnswer',
              issue: 'No correct answer option designated',
              question: questionText,
            });
            rowHasError = true;
          }
        }
      }

      if (qType === QuestionType.IMAGE_BASED) {
        const imageUrl = row.imageUrl || row.image || row.imageurl || row.metadata?.imageUrl;
        const hasMarkdownImg = /!\[.*?\]\(.*?\)/.test(questionText);
        if (!imageUrl && !hasMarkdownImg) {
          errors.push({
            row: rowNumber,
            field: 'image',
            issue: 'Image-based question must specify an imageUrl or embedded markdown image',
            question: questionText,
          });
          rowHasError = true;
        }
      }

      const explanationText = (
        typeof row.explanation === 'string' ? row.explanation : row.explanation?.explanation || ''
      ).trim();
      if (!explanationText) {
        warnings.push(`Row ${rowNumber}: Question is missing an explanation.`);
      }

      if (rowHasError) {
        invalid++;
      } else {
        valid++;
        if (validPreview.length < 5) {
          validPreview.push({
            questionText: questionText.slice(0, 80),
            subject: matchedSubject!.name,
            topic: matchedTopic!.name,
            questionType: qType,
            difficulty: (DifficultyLevel as any)[difficultyStr] || DifficultyLevel.MEDIUM,
          });
        }
      }
    }

    return {
      total,
      valid,
      invalid,
      duplicates,
      errors,
      warnings,
      validPreview,
    };
  }

  /**
   * Commit bulk import transaction
   */
  async commitBulkImport(dto: BulkImportDto, user: AuthenticatedUser) {
    let rawRows: any[] = [];
    if (dto.csvContent && dto.csvContent.trim().length > 0) {
      const trimmed = dto.csvContent.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          rawRows = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          rawRows = this.parseCsv(dto.csvContent);
        }
      } else {
        rawRows = this.parseCsv(dto.csvContent);
      }
    } else if (Array.isArray(dto.data)) {
      rawRows = dto.data;
    } else if (Array.isArray((dto as any)?.questions)) {
      rawRows = (dto as any).questions;
    } else if (Array.isArray(dto)) {
      rawRows = dto;
    }

    const [allSubjects, allChapters, allTopics, allSubtopics] = await Promise.all([
      this.prisma.client.subject.findMany(),
      this.prisma.client.chapter.findMany(),
      this.prisma.client.topic.findMany(),
      this.prisma.client.subtopic ? this.prisma.client.subtopic.findMany() : Promise.resolve([]),
    ]);

    let importedCount = 0;
    let skippedCount = 0;
    let duplicatesCount = 0;
    const validationErrors: BulkImportRowError[] = [];
    const warnings: string[] = [];

    await this.prisma.client.$transaction(async (tx) => {
      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const rowNumber = i + 1;
        const questionText = (
          row.questionText ||
          row.questiontext ||
          row.question ||
          row.text ||
          ''
        ).trim();
        const subjectKey = (
          row.subject ||
          row.subjectId ||
          row.subjectid ||
          row.subjectSlug ||
          row.subjectslug ||
          ''
        ).trim();
        const topicKey = (
          row.topic ||
          row.topicId ||
          row.topicid ||
          row.topicSlug ||
          row.topicslug ||
          ''
        ).trim();
        const subtopicKey = (
          row.subtopic ||
          row.subtopicId ||
          row.subtopicid ||
          row.subtopicSlug ||
          row.subtopicslug ||
          ''
        ).trim();

        if (!questionText || questionText.length < 3) {
          skippedCount++;
          validationErrors.push({ row: rowNumber, field: 'questionText', issue: 'Question text too short' });
          continue;
        }

        const subject = allSubjects.find(
          (s) =>
            s.id === subjectKey ||
            s.slug.toLowerCase() === subjectKey.toLowerCase() ||
            s.name.toLowerCase() === subjectKey.toLowerCase(),
        );
        const topic = allTopics.find(
          (t) =>
            t.id === topicKey ||
            t.slug.toLowerCase() === topicKey.toLowerCase() ||
            t.name.toLowerCase() === topicKey.toLowerCase(),
        );

        if (!subject || !topic) {
          skippedCount++;
          validationErrors.push({ row: rowNumber, field: 'taxonomy', issue: `Invalid subject (${subjectKey}) or topic (${topicKey})` });
          continue;
        }

        const chapter =
          allChapters.find((c) => c.id === topic.chapterId) ||
          allChapters.find((c) => c.subjectId === subject.id);
        if (!chapter) {
          skippedCount++;
          validationErrors.push({ row: rowNumber, field: 'chapter', issue: 'Chapter not found' });
          continue;
        }

        let subtopicId: string | null = null;
        if (subtopicKey) {
          const matchedSubtopic = allSubtopics.find(
            (st: any) =>
              st.topicId === topic.id &&
              (st.id === subtopicKey ||
                st.slug.toLowerCase() === subtopicKey.toLowerCase() ||
                st.name.toLowerCase() === subtopicKey.toLowerCase()),
          );
          if (matchedSubtopic) {
            subtopicId = matchedSubtopic.id;
          }
        }

        // Parse options
        let parsedOptions: any[] = [];
        const rawOptions = row.options;
        const rawCorrectAnswer = (
          row.correctAnswer ||
          row.correctanswer ||
          row.correct ||
          ''
        ).trim();

        if (Array.isArray(rawOptions)) {
          parsedOptions = rawOptions;
        } else if (typeof rawOptions === 'string') {
          if (rawOptions.trim().startsWith('[')) {
            try {
              parsedOptions = JSON.parse(rawOptions);
            } catch {
              parsedOptions = [];
            }
          } else {
            const parts = rawOptions.split('|').map((p) => p.trim());
            parsedOptions = parts.map((part, idx) => {
              const match = part.match(/^([A-Da-d0-9]+)[:\.)\s]+(.+)$/);
              const ident = match ? match[1].toUpperCase() : String.fromCharCode(65 + idx);
              const text = match ? match[2].trim() : part;
              const isCorr = rawCorrectAnswer
                ? rawCorrectAnswer.toUpperCase().includes(ident)
                : false;
              return { identifier: ident, optionText: text, isCorrect: isCorr };
            });
          }
        }

        const qTypeStr = (
          row.questionType ||
          row.questiontype ||
          row.type ||
          'MCQ_SINGLE'
        )
          .trim()
          .toUpperCase();
        const qType = (QuestionType as any)[qTypeStr] || QuestionType.MCQ_SINGLE;
        const diffStr = (row.difficulty || 'MEDIUM').trim().toUpperCase();
        const difficulty = (DifficultyLevel as any)[diffStr] || DifficultyLevel.MEDIUM;

        await tx.question.create({
          data: {
            subjectId: subject.id,
            chapterId: chapter.id,
            topicId: topic.id,
            subtopicId,
            questionType: qType,
            questionText,
            marks: row.marks ? Number(row.marks) : 1.0,
            negativeMarks: row.negativemarks ? Number(row.negativemarks) : 0.33,
            difficulty,
            status: QuestionStatus.DRAFT,
            source: row.source || 'Bulk Import',
            year: row.year ? Number(row.year) : null,
            exam: row.exam || null,
            language: row.language || 'en',
            metadata: row.metadata || (row.imageUrl ? { imageUrl: row.imageUrl } : undefined),
            createdById: user.id,
            options: {
              create: parsedOptions.map((opt, idx) => ({
                identifier: opt.identifier || String.fromCharCode(65 + idx),
                optionText: opt.optionText || opt.text || String(opt),
                isCorrect: Boolean(opt.isCorrect),
                orderIndex: idx,
              })),
            },
            ...(row.explanation
              ? {
                  explanation: {
                    create: {
                      explanation: typeof row.explanation === 'string' ? row.explanation : row.explanation.explanation,
                      keyConcept: row.explanation?.keyConcept || null,
                      trickFormula: row.explanation?.trickFormula || null,
                    },
                  },
                }
              : {}),
          },
        });

        importedCount++;
      }
    });

    // Audit log
    await this.auditService.logAction(user.id, 'question:bulk_import', 'QUESTION', 'BATCH', {
      importedCount,
      skippedCount,
      totalReceived: rawRows.length,
    });

    return {
      totalRecords: rawRows.length,
      successful: importedCount,
      failed: skippedCount,
      duplicates: duplicatesCount,
      validationErrors,
      warnings,
      importedCount,
      skippedCount,
      message: `Successfully imported ${importedCount} questions (${skippedCount} skipped)`,
    };
  }
}
