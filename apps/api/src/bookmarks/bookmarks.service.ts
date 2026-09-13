import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async listBookmarks(userId: string, subjectId?: string, search?: string) {
    const where: any = { userId };

    if (subjectId) {
      where.question = { ...where.question, subjectId };
    }

    if (search && search.trim()) {
      where.question = {
        ...where.question,
        questionText: { contains: search.trim(), mode: 'insensitive' },
      };
    }

    return this.prisma.client.bookmark.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        question: {
          include: {
            options: { orderBy: { orderIndex: 'asc' } },
            explanation: true,
            subject: { select: { id: true, name: true, slug: true } },
            chapter: { select: { id: true, name: true, slug: true } },
            topic: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  async toggleBookmark(userId: string, questionId: string, notes?: string) {
    const existing = await this.prisma.client.bookmark.findUnique({
      where: {
        userId_questionId: { userId, questionId },
      },
    });

    if (existing) {
      await this.prisma.client.bookmark.delete({
        where: { id: existing.id },
      });
      return { isBookmarked: false };
    }

    const bookmark = await this.prisma.client.bookmark.create({
      data: {
        userId,
        questionId,
        notes,
      },
    });
    return { isBookmarked: true, bookmark };
  }

  async removeBookmark(userId: string, questionId: string) {
    const existing = await this.prisma.client.bookmark.findUnique({
      where: {
        userId_questionId: { userId, questionId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Bookmark record not found');
    }

    await this.prisma.client.bookmark.delete({
      where: { id: existing.id },
    });

    return { success: true, removedQuestionId: questionId };
  }
}
