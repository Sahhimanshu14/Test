import { Injectable, NotFoundException, ConflictException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_PREFIX, CACHE_TTL } from '../common/cache/cache.service';

export interface CreateSubjectDto {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  orderIndex?: number;
}

export interface CreateChapterDto {
  subjectId: string;
  name: string;
  slug: string;
  orderIndex?: number;
}

export interface CreateTopicDto {
  chapterId: string;
  name: string;
  slug: string;
  orderIndex?: number;
}

@Injectable()
export class SubjectsService {
  private readonly cacheService: CacheService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() cache?: CacheService,
  ) {
    this.cacheService = cache || new CacheService(new ConfigService());
  }

  async findAll() {
    return this.cacheService.wrap(
      `${CACHE_PREFIX.SUBJECTS}:all`,
      async () =>
        this.prisma.client.subject.findMany({
          orderBy: { orderIndex: 'asc' },
          include: {
            chapters: {
              orderBy: { orderIndex: 'asc' },
              include: {
                topics: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
            _count: {
              select: {
                chapters: true,
                questions: true,
              },
            },
          },
        }),
      CACHE_TTL.SUBJECTS,
    );
  }

  async findBySlug(slug: string) {
    return this.cacheService.wrap(
      `${CACHE_PREFIX.SUBJECTS}:slug:${slug}`,
      async () => {
        const subject = await this.prisma.client.subject.findUnique({
          where: { slug },
          include: {
            chapters: {
              orderBy: { orderIndex: 'asc' },
              include: {
                topics: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        });

        if (!subject) {
          throw new NotFoundException(`Subject with slug "${slug}" not found`);
        }

        return subject;
      },
      CACHE_TTL.SUBJECTS,
    );
  }

  async createSubject(data: CreateSubjectDto) {
    const existing = await this.prisma.client.subject.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new ConflictException(`Subject with slug "${data.slug}" already exists`);
    }

    const created = await this.prisma.client.subject.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon || 'BookOpen',
        orderIndex: data.orderIndex || 0,
      },
    });

    await this.cacheService.delPrefix(CACHE_PREFIX.SUBJECTS);
    return created;
  }

  async createChapter(data: CreateChapterDto) {
    const subject = await this.prisma.client.subject.findUnique({
      where: { id: data.subjectId },
    });
    if (!subject) {
      throw new NotFoundException(`Subject with id "${data.subjectId}" not found`);
    }

    const created = await this.prisma.client.chapter.create({
      data: {
        subjectId: data.subjectId,
        name: data.name,
        slug: data.slug,
        orderIndex: data.orderIndex || 0,
      },
    });

    await this.cacheService.delPrefix(CACHE_PREFIX.SUBJECTS);
    return created;
  }

  async createTopic(data: CreateTopicDto) {
    const chapter = await this.prisma.client.chapter.findUnique({
      where: { id: data.chapterId },
    });
    if (!chapter) {
      throw new NotFoundException(`Chapter with id "${data.chapterId}" not found`);
    }

    const created = await this.prisma.client.topic.create({
      data: {
        chapterId: data.chapterId,
        name: data.name,
        slug: data.slug,
        orderIndex: data.orderIndex || 0,
      },
    });

    await this.cacheService.delPrefix(CACHE_PREFIX.SUBJECTS);
    return created;
  }
}
