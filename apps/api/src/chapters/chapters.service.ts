import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySubject(subjectSlug: string) {
    const subject = await this.prisma.client.subject.findUnique({
      where: { slug: subjectSlug },
    });
    if (!subject) {
      throw new NotFoundException(`Subject "${subjectSlug}" not found`);
    }

    return this.prisma.client.chapter.findMany({
      where: { subjectId: subject.id },
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
    });
  }

  async findOne(id: string) {
    const chapter = await this.prisma.client.chapter.findUnique({
      where: { id },
      include: {
        subject: true,
        topics: {
          orderBy: { orderIndex: 'asc' },
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with id "${id}" not found`);
    }
    return chapter;
  }
}
