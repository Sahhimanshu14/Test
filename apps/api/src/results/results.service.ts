import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getResultByAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.client.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            sections: {
              include: {
                testQuestions: {
                  include: {
                    question: {
                      include: {
                        options: true,
                        explanation: true,
                        subject: true,
                        chapter: true,
                        topic: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        result: {
          include: {
            subjectBreakdown: true,
            topicBreakdown: true,
          },
        },
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Test attempt not found');
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException('Access denied to this result');
    }
    if (!attempt.result) {
      throw new NotFoundException(
        'Results for this attempt are still being calculated or attempt is in progress',
      );
    }

    // Collect question IDs and fetch current user's bookmarks
    const questionIds: string[] = [];
    for (const sec of attempt.test.sections) {
      for (const tq of sec.testQuestions) {
        if (tq.question?.id) {
          questionIds.push(tq.question.id);
        }
      }
    }

    const bookmarks = await this.prisma.client.bookmark.findMany({
      where: {
        userId,
        questionId: { in: questionIds },
      },
      select: { questionId: true },
    });

    const bookmarkedQuestionIds = bookmarks.map((b) => b.questionId);

    return {
      ...attempt,
      bookmarkedQuestionIds,
    };
  }

  async listUserResults(userId: string, page?: number, limit?: number) {
    const query: any = {
      where: {
        attempt: { userId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        attempt: {
          select: {
            id: true,
            startedAt: true,
            submittedAt: true,
            timeSpentSeconds: true,
            test: {
              select: { id: true, title: true, slug: true, totalMarks: true },
            },
          },
        },
      },
    };

    if (page !== undefined || limit !== undefined) {
      const safePage = Math.max(1, page || 1);
      const safeLimit = Math.min(100, Math.max(1, limit || 20));
      query.skip = (safePage - 1) * safeLimit;
      query.take = safeLimit;
    }

    return this.prisma.client.result.findMany(query);
  }
}
