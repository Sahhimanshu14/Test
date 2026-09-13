import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TestType } from '@cdsprep/types';
import {
  CreateTestInput,
  UpdateTestInput,
  CreateTestSectionInput,
  AssignTestQuestionsInput,
} from '@cdsprep/validation';

@Injectable()
export class TestsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTests(isFullMock?: boolean, testType?: TestType) {
    return this.prisma.client.test.findMany({
      where: {
        isPublished: true,
        ...(typeof isFullMock === 'boolean' ? { isFullMock } : {}),
        ...(testType ? { testType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        chapter: { select: { id: true, name: true, slug: true } },
        topic: { select: { id: true, name: true, slug: true } },
        sections: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            _count: { select: { testQuestions: true } },
          },
        },
        _count: { select: { attempts: true } },
      },
    });
  }

  async getTestPreview(slugOrId: string) {
    const test = await this.prisma.client.test.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      include: {
        subject: true,
        chapter: true,
        topic: true,
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            _count: { select: { testQuestions: true } },
          },
        },
      },
    });

    if (!test || !test.isPublished) {
      throw new NotFoundException(`Test "${slugOrId}" not found`);
    }

    return test;
  }

  async createTest(dto: CreateTestInput) {
    const existing = await this.prisma.client.test.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException(`Test with slug "${dto.slug}" already exists`);
    }

    return this.prisma.client.test.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description || null,
        testType: dto.testType,
        subjectId: dto.subjectId || null,
        chapterId: dto.chapterId || null,
        topicId: dto.topicId || null,
        targetAcademy: dto.targetAcademy,
        durationMinutes: dto.durationMinutes,
        totalMarks: dto.totalMarks,
        passingMarks: dto.passingMarks || null,
        negativeMarks: dto.negativeMarks ?? 0.33,
        randomize: Boolean(dto.randomize),
        questionCount: dto.questionCount || null,
        difficulty: dto.difficulty || null,
        instructions: dto.instructions || null,
        isPublished: Boolean(dto.isPublished),
      },
    });
  }

  async createSection(testId: string, dto: CreateTestSectionInput) {
    const test = await this.prisma.client.test.findUnique({
      where: { id: testId },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return this.prisma.client.testSection.create({
      data: {
        testId,
        name: dto.name,
        orderIndex: dto.orderIndex,
        durationMinutes: dto.durationMinutes || null,
      },
    });
  }

  async assignQuestions(sectionId: string, dto: AssignTestQuestionsInput) {
    const section = await this.prisma.client.testSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException('Test section not found');
    }

    // Assign sequentially
    const items = dto.questionIds.map((qId, idx) => ({
      testSectionId: sectionId,
      questionId: qId,
      orderIndex: idx,
    }));

    // Idempotent upserts or transactions
    await this.prisma.client.$transaction(
      items.map((item) =>
        this.prisma.client.testQuestion.upsert({
          where: {
            testSectionId_questionId: {
              testSectionId: item.testSectionId,
              questionId: item.questionId,
            },
          },
          update: { orderIndex: item.orderIndex },
          create: item,
        }),
      ),
    );

    return {
      message: `Successfully assigned ${dto.questionIds.length} questions to section`,
      sectionId,
    };
  }
}
