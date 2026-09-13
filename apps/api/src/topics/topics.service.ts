import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TopicsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByChapter(chapterId: string) {
    return this.prisma.client.topic.findMany({
      where: { chapterId },
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: { select: { questions: true } },
      },
    });
  }

  async findOne(id: string) {
    const topic = await this.prisma.client.topic.findUnique({
      where: { id },
      include: {
        chapter: {
          include: { subject: true },
        },
        _count: { select: { questions: true } },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with id "${id}" not found`);
    }

    return topic;
  }
}
