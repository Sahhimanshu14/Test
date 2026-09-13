import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AttemptsService } from '../attempts/attempts.service';
import { CacheService, CACHE_PREFIX, CACHE_TTL } from '../common/cache/cache.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  CreatePYQPaperDto,
  UpdatePYQPaperDto,
  MapPYQQuestionsDto,
  PYQFilterQueryDto,
  BulkImportPYQDto,
} from './dto/pyqs.dto';

@Injectable()
export class PyqsService {
  private readonly auditService: AuditService;
  private readonly attemptsService: AttemptsService;
  private readonly cacheService: CacheService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() auditService?: AuditService,
    @Optional() attemptsService?: AttemptsService,
    @Optional() cache?: CacheService,
  ) {
    this.auditService = auditService || ({ logAction: async () => {} } as any);
    this.attemptsService = attemptsService || ({} as any);
    this.cacheService = cache || new CacheService(new ConfigService());
  }

  /**
   * List organized UPSC CDS PYQ papers with multi-facet filters
   */
  async listPapers(filters?: PYQFilterQueryDto, isAdmin = false) {
    const where: any = {
      ...(filters?.year ? { year: Number(filters.year) } : {}),
      ...(filters?.session ? { session: filters.session } : {}),
      ...(filters?.exam ? { exam: { contains: filters.exam, mode: 'insensitive' } } : {}),
      ...(filters?.subjectSlug ? { subjectSlug: filters.subjectSlug } : {}),
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
    };

    // Public students only see published papers
    if (!isAdmin) {
      where.isPublished = true;
    } else if (filters?.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { source: { contains: filters.search, mode: 'insensitive' } },
        { attribution: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filter by topic if topicId provided
    if (filters?.topicId) {
      where.questions = {
        some: {
          question: {
            topicId: filters.topicId,
          },
        },
      };
    }

    const fetchPapers = async () => {
      const papers = await this.prisma.client.pYQPaper.findMany({
        where,
        orderBy: [{ year: 'desc' }, { session: 'asc' }, { subjectSlug: 'asc' }],
        include: {
          subject: { select: { id: true, name: true, slug: true, icon: true } },
          _count: { select: { questions: true } },
        },
      });

      return papers.map((p) => ({
        ...p,
        totalMarks: Number(p.totalMarks),
        questionCount: p._count.questions,
      }));
    };

    if (!isAdmin && !filters?.search) {
      const cacheKey = `${CACHE_PREFIX.PYQS}:list:${JSON.stringify(filters || {})}`;
      return this.cacheService.wrap(cacheKey, fetchPapers, CACHE_TTL.PYQS);
    }

    return fetchPapers();
  }

  /**
   * Get complete PYQ paper with questions, options, solution, and license attribution
   */
  async getPaperDetails(id: string) {
    const cacheKey = `${CACHE_PREFIX.PYQS}:paper:${id}`;

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const paper = await this.prisma.client.pYQPaper.findUnique({
          where: { id },
          include: {
            subject: true,
            questions: {
              orderBy: { questionNumber: 'asc' },
              include: {
                question: {
                  include: {
                    options: { orderBy: { orderIndex: 'asc' } },
                    explanation: true,
                    subject: true,
                    chapter: true,
                    topic: true,
                    tagMaps: {
                      include: { tag: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!paper) {
          throw new NotFoundException(`PYQ paper with id "${id}" not found`);
        }

        return {
          ...paper,
          totalMarks: Number(paper.totalMarks),
          questions: paper.questions.map((pq) => ({
            id: pq.id,
            questionNumber: pq.questionNumber,
            question: {
              ...pq.question,
              marks: Number(pq.question.marks),
              negativeMarks: Number(pq.question.negativeMarks),
              tags: pq.question.tagMaps?.map((tm) => tm.tag.name) || [],
            },
          })),
        };
      },
      CACHE_TTL.PYQS,
    );
  }

  /**
   * Discovery catalog: distinct years with counts and metadata
   */
  async getYearsCatalog() {
    const papers = await this.prisma.client.pYQPaper.findMany({
      where: { isPublished: true },
      select: { year: true, session: true, subjectSlug: true, exam: true },
    });

    const yearsMap = new Map<number, { year: number; paperCount: number; sessions: Set<string> }>();

    for (const p of papers) {
      if (!yearsMap.has(p.year)) {
        yearsMap.set(p.year, { year: p.year, paperCount: 0, sessions: new Set() });
      }
      const entry = yearsMap.get(p.year)!;
      entry.paperCount++;
      entry.sessions.add(p.session);
    }

    return Array.from(yearsMap.values())
      .map((item) => ({
        year: item.year,
        paperCount: item.paperCount,
        sessions: Array.from(item.sessions).sort(),
      }))
      .sort((a, b) => b.year - a.year);
  }

  /**
   * Discovery catalog: subjects with PYQ availability
   */
  async getSubjectsCatalog() {
    const subjects = await this.prisma.client.subject.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: {
          select: { pyqPapers: true },
        },
      },
    });

    return subjects.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      icon: s.icon,
      pyqCount: s._count.pyqPapers,
    }));
  }

  /**
   * Ensure a backing Test exists for a PYQPaper and all questions are mapped to its section
   */
  async ensureBackingTest(paperId: string) {
    const paper = await this.prisma.client.pYQPaper.findUnique({
      where: { id: paperId },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!paper) {
      throw new NotFoundException(`PYQ paper "${paperId}" not found`);
    }

    let testId = paper.testId;

    if (!testId) {
      // Create new backing Test
      const slug = `pyq-${paper.year}-${paper.session.toLowerCase()}-${paper.subjectSlug}-${paper.id.slice(0, 8)}`;
      const test = await this.prisma.client.test.create({
        data: {
          title: paper.title,
          slug,
          description: `Official UPSC Combined Defence Services (${paper.exam}) Previous Year Question Paper (${paper.year} Session ${paper.session}).`,
          subjectId: paper.subjectId,
          isFullMock: true,
          durationMinutes: paper.durationMin,
          totalMarks: paper.totalMarks,
          isPublished: paper.isPublished,
          sections: {
            create: {
              name: 'Official Examination Paper',
              orderIndex: 0,
              durationMinutes: paper.durationMin,
              testQuestions: {
                create: paper.questions.map((pq) => ({
                  questionId: pq.questionId,
                  orderIndex: pq.questionNumber - 1,
                })),
              },
            },
          },
        },
      });

      testId = test.id;
      await this.prisma.client.pYQPaper.update({
        where: { id: paperId },
        data: { testId },
      });
    } else {
      // Sync backing test status & questions
      await this.prisma.client.test.update({
        where: { id: testId },
        data: {
          title: paper.title,
          durationMinutes: paper.durationMin,
          totalMarks: paper.totalMarks,
          isPublished: paper.isPublished,
        },
      });

      // Sync test section questions
      const section = await this.prisma.client.testSection.findFirst({
        where: { testId },
      });

      if (section) {
        await this.prisma.client.testQuestion.deleteMany({
          where: { testSectionId: section.id },
        });

        await this.prisma.client.testQuestion.createMany({
          data: paper.questions.map((pq) => ({
            testSectionId: section.id,
            questionId: pq.questionId,
            orderIndex: pq.questionNumber - 1,
          })),
        });
      }
    }

    return testId;
  }

  /**
   * Start Test Attempt from PYQ Paper
   * Integrates directly into Authoritative Test Engine (AttemptsService)
   */
  async startPaperAttempt(paperId: string, userId: string) {
    const paper = await this.prisma.client.pYQPaper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      throw new NotFoundException(`PYQ paper "${paperId}" not found`);
    }

    if (!paper.isPublished) {
      throw new BadRequestException('This previous year question paper is not yet published for testing');
    }

    // Ensure backing Test entity exists and is in sync
    const testId = await this.ensureBackingTest(paperId);

    // Delegate directly to the authoritative server engine
    return this.attemptsService.startAttempt(userId, testId);
  }

  /**
   * Admin: Create PYQ Paper with legal licensing enforcement
   */
  async createPaper(dto: CreatePYQPaperDto, user: AuthenticatedUser) {
    // 1. Check duplicate paper
    const exam = dto.exam || 'CDS';
    const existing = await this.prisma.client.pYQPaper.findFirst({
      where: {
        year: Number(dto.year),
        session: dto.session,
        exam,
        subjectSlug: dto.subjectSlug,
      },
    });

    if (existing) {
      throw new ConflictException(
        `A PYQ paper for Year ${dto.year} Session ${dto.session} (${exam} - ${dto.subjectSlug}) already exists (ID: ${existing.id})`,
      );
    }

    // 2. Validate subject
    const subject = await this.prisma.client.subject.findFirst({
      where: {
        OR: [{ slug: dto.subjectSlug }, { id: dto.subjectId || '' }],
      },
    });

    if (!subject) {
      throw new BadRequestException(`Subject with slug "${dto.subjectSlug}" does not exist in taxonomy`);
    }

    // 3. Legal attribution validation
    if (!dto.source || !dto.attribution) {
      throw new BadRequestException(
        'Legal compliance error: Source metadata and copyright attribution statement are required',
      );
    }

    // 4. Create Paper in database
    const paper = await this.prisma.client.pYQPaper.create({
      data: {
        year: Number(dto.year),
        session: dto.session,
        exam,
        subjectSlug: subject.slug,
        subjectId: subject.id,
        title: dto.title,
        totalMarks: dto.totalMarks ?? 100.0,
        durationMin: dto.durationMin ?? 120,
        isPublished: Boolean(dto.isPublished),
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        licenseType: dto.licenseType || 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
        attribution: dto.attribution,
        licenseMetadata: dto.licenseMetadata || {
          verifiedLegalSource: true,
          importedBy: user.email,
          rightsHolder: 'UPSC / Government of India',
        },
      },
    });

    // 5. Audit log
    await this.auditService.logAction(user.id, 'pyq:create_paper', 'PYQ_PAPER', paper.id, {
      title: paper.title,
      year: paper.year,
      session: paper.session,
      licenseType: paper.licenseType,
    });

    return paper;
  }

  /**
   * Admin: Update PYQ Paper metadata
   */
  async updatePaper(id: string, dto: UpdatePYQPaperDto, user: AuthenticatedUser) {
    const existing = await this.prisma.client.pYQPaper.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`PYQ paper with id "${id}" not found`);
    }

    // Check duplicate if key identifiers are being updated
    if (
      (dto.year && dto.year !== existing.year) ||
      (dto.session && dto.session !== existing.session) ||
      (dto.exam && dto.exam !== existing.exam) ||
      (dto.subjectSlug && dto.subjectSlug !== existing.subjectSlug)
    ) {
      const targetYear = dto.year ? Number(dto.year) : existing.year;
      const targetSession = dto.session || existing.session;
      const targetExam = dto.exam || existing.exam;
      const targetSlug = dto.subjectSlug || existing.subjectSlug;

      const dup = await this.prisma.client.pYQPaper.findFirst({
        where: {
          id: { not: id },
          year: targetYear,
          session: targetSession,
          exam: targetExam,
          subjectSlug: targetSlug,
        },
      });

      if (dup) {
        throw new ConflictException(
          `Conflict: A paper for ${targetYear} Session ${targetSession} (${targetExam} - ${targetSlug}) already exists`,
        );
      }
    }

    const updated = await this.prisma.client.pYQPaper.update({
      where: { id },
      data: {
        ...(dto.year ? { year: Number(dto.year) } : {}),
        ...(dto.session ? { session: dto.session } : {}),
        ...(dto.exam ? { exam: dto.exam } : {}),
        ...(dto.subjectSlug ? { subjectSlug: dto.subjectSlug } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.totalMarks !== undefined ? { totalMarks: dto.totalMarks } : {}),
        ...(dto.durationMin !== undefined ? { durationMin: dto.durationMin } : {}),
        ...(dto.source ? { source: dto.source } : {}),
        ...(dto.sourceUrl !== undefined ? { sourceUrl: dto.sourceUrl } : {}),
        ...(dto.licenseType ? { licenseType: dto.licenseType } : {}),
        ...(dto.attribution ? { attribution: dto.attribution } : {}),
        ...(dto.licenseMetadata !== undefined ? { licenseMetadata: dto.licenseMetadata } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
      },
    });

    // Auto-sync backing test if test exists
    if (updated.testId) {
      await this.ensureBackingTest(id).catch(() => null);
    }

    // Audit log
    await this.auditService.logAction(user.id, 'pyq:update_paper', 'PYQ_PAPER', id, {
      updatedFields: Object.keys(dto),
    });

    return updated;
  }

  /**
   * Admin: Map questions to PYQ paper with duplicate mapping & answer validation
   */
  async mapQuestions(paperId: string, dto: MapPYQQuestionsDto, user: AuthenticatedUser) {
    const paper = await this.prisma.client.pYQPaper.findUnique({ where: { id: paperId } });
    if (!paper) {
      throw new NotFoundException(`PYQ paper with id "${paperId}" not found`);
    }

    if (!dto.questions || dto.questions.length === 0) {
      throw new BadRequestException('At least one question must be provided in the mapping list');
    }

    // 1. Validation: Unique questionNumbers and unique questionIds
    const seenNumbers = new Set<number>();
    const seenQuestionIds = new Set<string>();

    for (const q of dto.questions) {
      if (seenNumbers.has(q.questionNumber)) {
        throw new BadRequestException(`Duplicate questionNumber detected in mapping: #${q.questionNumber}`);
      }
      seenNumbers.add(q.questionNumber);

      if (seenQuestionIds.has(q.questionId)) {
        throw new BadRequestException(`Duplicate questionId mapping detected: question ${q.questionId} mapped twice`);
      }
      seenQuestionIds.add(q.questionId);
    }

    // 2. Validate all questions exist and have correct options
    const questionRecords = await this.prisma.client.question.findMany({
      where: {
        id: { in: Array.from(seenQuestionIds) },
        deletedAt: null,
      },
      include: {
        options: true,
      },
    });

    if (questionRecords.length !== seenQuestionIds.size) {
      const foundIds = new Set(questionRecords.map((q) => q.id));
      const missingIds = Array.from(seenQuestionIds).filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Questions not found in database: ${missingIds.join(', ')}`);
    }

    // Quality check: Ensure all mapped questions have at least one correct option or valid answer
    for (const qr of questionRecords) {
      const hasCorrect = qr.options.some((o) => o.isCorrect);
      if (!hasCorrect && qr.questionType !== 'NUMERICAL') {
        throw new BadRequestException(
          `Quality control error: Question "${qr.id}" has no correct answer designated`,
        );
      }
    }

    // 3. Transactional update: replace mappings
    await this.prisma.client.$transaction(async (tx) => {
      await tx.pYQQuestion.deleteMany({
        where: { pyqPaperId: paperId },
      });

      await tx.pYQQuestion.createMany({
        data: dto.questions.map((q) => ({
          pyqPaperId: paperId,
          questionId: q.questionId,
          questionNumber: q.questionNumber,
        })),
      });
    });

    // 4. Sync backing test
    await this.ensureBackingTest(paperId);

    // 5. Audit log
    await this.auditService.logAction(user.id, 'pyq:map_questions', 'PYQ_PAPER', paperId, {
      questionCount: dto.questions.length,
    });

    return this.getPaperDetails(paperId);
  }

  /**
   * Admin: Publish PYQ Paper
   */
  async publishPaper(paperId: string, user: AuthenticatedUser) {
    const paper = await this.prisma.client.pYQPaper.findUnique({
      where: { id: paperId },
      include: { _count: { select: { questions: true } } },
    });

    if (!paper) {
      throw new NotFoundException(`PYQ paper "${paperId}" not found`);
    }

    if (paper._count.questions === 0) {
      throw new BadRequestException('Cannot publish a PYQ paper with 0 mapped questions');
    }

    const updated = await this.prisma.client.pYQPaper.update({
      where: { id: paperId },
      data: { isPublished: true },
    });

    // Ensure backing Test is synced and marked published
    await this.ensureBackingTest(paperId);

    // Audit log
    await this.auditService.logAction(user.id, 'pyq:publish_paper', 'PYQ_PAPER', paperId, {
      title: updated.title,
    });

    return updated;
  }

  /**
   * Admin: Bulk Import PYQ Paper + Questions with legal attribution validation
   */
  async bulkImportPYQ(dto: BulkImportPYQDto, user: AuthenticatedUser) {
    // 1. Validate Legal compliance
    if (!dto.paper.source || !dto.paper.attribution) {
      throw new BadRequestException('Legal compliance error: Paper source and attribution metadata are required');
    }

    if (!dto.questions || dto.questions.length === 0) {
      throw new BadRequestException('Bulk import must contain at least 1 question');
    }

    // 2. Check duplicate paper
    const exam = dto.paper.exam || 'CDS';
    const existingPaper = await this.prisma.client.pYQPaper.findFirst({
      where: {
        year: Number(dto.paper.year),
        session: dto.paper.session,
        exam,
        subjectSlug: dto.paper.subjectSlug,
      },
    });

    if (existingPaper) {
      throw new ConflictException(
        `Duplicate paper: Paper for ${dto.paper.year} Session ${dto.paper.session} (${exam} - ${dto.paper.subjectSlug}) already exists`,
      );
    }

    // 3. Resolve Subject
    const subject = await this.prisma.client.subject.findFirst({
      where: {
        OR: [{ slug: dto.paper.subjectSlug }, { id: dto.paper.subjectId || '' }],
      },
      include: {
        chapters: {
          include: { topics: true },
        },
      },
    });

    if (!subject) {
      throw new BadRequestException(`Subject "${dto.paper.subjectSlug}" does not exist in syllabus`);
    }

    const defaultChapter = subject.chapters[0];
    const defaultTopic = defaultChapter?.topics[0];

    // 4. Atomic transaction creating Paper, Questions, and Mappings
    const createdPaper = await this.prisma.client.$transaction(async (tx) => {
      const paper = await tx.pYQPaper.create({
        data: {
          year: Number(dto.paper.year),
          session: dto.paper.session,
          exam,
          subjectSlug: subject.slug,
          subjectId: subject.id,
          title: dto.paper.title,
          totalMarks: dto.paper.totalMarks ?? 100.0,
          durationMin: dto.paper.durationMin ?? 120,
          isPublished: Boolean(dto.paper.isPublished),
          source: dto.paper.source,
          sourceUrl: dto.paper.sourceUrl,
          licenseType: dto.paper.licenseType || 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
          attribution: dto.paper.attribution,
          licenseMetadata: dto.paper.licenseMetadata || {
            verifiedLegalSource: true,
            importedBy: user.email,
          },
        },
      });

      for (let i = 0; i < dto.questions.length; i++) {
        const qData = dto.questions[i];
        const questionNumber = qData.questionNumber || i + 1;

        // Resolve options
        const rawOptions = qData.options || [];
        const optionsList = Array.isArray(rawOptions) ? rawOptions : [];

        const question = await tx.question.create({
          data: {
            subjectId: subject.id,
            chapterId: defaultChapter?.id || '',
            topicId: defaultTopic?.id || '',
            questionText: qData.questionText || qData.question || `Question #${questionNumber}`,
            marks: qData.marks ? Number(qData.marks) : 1.0,
            negativeMarks: qData.negativeMarks ? Number(qData.negativeMarks) : 0.33,
            difficulty: qData.difficulty || 'MEDIUM',
            status: 'PUBLISHED',
            source: paper.source,
            year: paper.year,
            exam: paper.exam,
            language: 'en',
            options: {
              create: optionsList.map((opt: any, idx: number) => ({
                identifier: opt.identifier || String.fromCharCode(65 + idx),
                optionText: opt.optionText || opt.text || String(opt),
                isCorrect: Boolean(opt.isCorrect),
                orderIndex: idx,
              })),
            },
            ...(qData.explanation
              ? {
                  explanation: {
                    create: {
                      explanation: typeof qData.explanation === 'string' ? qData.explanation : qData.explanation.explanation,
                    },
                  },
                }
              : {}),
          },
        });

        await tx.pYQQuestion.create({
          data: {
            pyqPaperId: paper.id,
            questionId: question.id,
            questionNumber,
          },
        });
      }

      return paper;
    });

    // 5. Sync backing Test
    await this.ensureBackingTest(createdPaper.id);

    // 6. Audit log
    await this.auditService.logAction(user.id, 'pyq:bulk_import', 'PYQ_PAPER', createdPaper.id, {
      questionCount: dto.questions.length,
      licenseType: createdPaper.licenseType,
    });

    return this.getPaperDetails(createdPaper.id);
  }

  /**
   * Admin: Delete PYQ paper
   */
  async deletePaper(id: string, user: AuthenticatedUser) {
    const paper = await this.prisma.client.pYQPaper.findUnique({ where: { id } });
    if (!paper) {
      throw new NotFoundException(`PYQ paper with id "${id}" not found`);
    }

    await this.prisma.client.pYQPaper.delete({ where: { id } });

    await this.auditService.logAction(user.id, 'pyq:delete_paper', 'PYQ_PAPER', id, {
      title: paper.title,
    });

    return { success: true, message: `PYQ paper "${paper.title}" deleted` };
  }
}
