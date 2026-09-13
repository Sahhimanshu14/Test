import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MistakeStatus } from '@cdsprep/types';

@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMistakes(userId: string, status?: MistakeStatus) {
    const mistakes = await this.prisma.client.mistake.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { lastMistakeAt: 'desc' },
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

    if (mistakes.length === 0) {
      return [];
    }

    const questionIds = mistakes.map((m) => m.questionId);

    // Concurrently fetch latest answer selections & bookmarks
    const [attemptAnswers, practiceAnswers, bookmarks] = await Promise.all([
      this.prisma.client.attemptAnswer.findMany({
        where: {
          attempt: { userId },
          questionId: { in: questionIds },
          selectedOptionId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: { questionId: true, selectedOptionId: true, createdAt: true },
      }),
      this.prisma.client.practiceAnswer.findMany({
        where: {
          session: { userId },
          questionId: { in: questionIds },
          selectedOptionId: { not: null },
        },
        orderBy: { answeredAt: 'desc' },
        select: { questionId: true, selectedOptionId: true, answeredAt: true },
      }),
      this.prisma.client.bookmark.findMany({
        where: {
          userId,
          questionId: { in: questionIds },
        },
        select: { questionId: true },
      }),
    ]);

    const bookmarkedSet = new Set(bookmarks.map((b) => b.questionId));

    // Determine latest selected option per question
    const selectedOptionMap = new Map<string, string>();
    for (const ans of attemptAnswers) {
      if (ans.selectedOptionId && !selectedOptionMap.has(ans.questionId)) {
        selectedOptionMap.set(ans.questionId, ans.selectedOptionId);
      }
    }
    for (const ans of practiceAnswers) {
      if (ans.selectedOptionId && !selectedOptionMap.has(ans.questionId)) {
        selectedOptionMap.set(ans.questionId, ans.selectedOptionId);
      }
    }

    return mistakes.map((m) => {
      const userSelectedOptId = selectedOptionMap.get(m.questionId);
      const userSelectedOption =
        m.question.options.find((o) => o.id === userSelectedOptId) || null;
      const correctOption =
        m.question.options.find((o) => o.isCorrect) || null;

      return {
        ...m,
        userSelectedOption,
        correctOption,
        isBookmarked: bookmarkedSet.has(m.questionId),
      };
    });
  }

  async updateMistakeStatus(
    userId: string,
    mistakeId: string,
    status: MistakeStatus,
    isCareless?: boolean,
  ) {
    const mistake = await this.prisma.client.mistake.findUnique({
      where: { id: mistakeId },
    });

    if (!mistake || mistake.userId !== userId) {
      throw new NotFoundException('Mistake record not found');
    }

    return this.prisma.client.mistake.update({
      where: { id: mistakeId },
      data: {
        status,
        ...(typeof isCareless === 'boolean' ? { isCareless } : {}),
      },
    });
  }

  async markMastered(userId: string, mistakeId: string) {
    return this.updateMistakeStatus(userId, mistakeId, MistakeStatus.MASTERED);
  }
}
