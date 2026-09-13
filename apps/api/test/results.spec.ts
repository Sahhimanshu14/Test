import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResultsService } from '../src/results/results.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('Results Service Suite', () => {
  let resultsService: ResultsService;
  let mockPrisma: any;

  const userId = 'cadet-user-01';
  const otherUserId = 'attacker-user-02';
  const attemptId = 'attempt-123';

  beforeEach(() => {
    mockPrisma = {
      client: {
        testAttempt: {
          findUnique: vi.fn(),
        },
        bookmark: {
          findMany: vi.fn(),
        },
        result: {
          findMany: vi.fn(),
        },
      },
    };

    resultsService = new ResultsService(mockPrisma);
  });

  describe('getResultByAttempt', () => {
    it('throws NotFoundException when attempt does not exist', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(null);

      await expect(
        resultsService.getResultByAttempt(userId, 'non-existent-attempt'),
      ).rejects.toThrow(NotFoundException);
    });

    it('enforces ownership: throws ForbiddenException when user does not own attempt', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue({
        id: attemptId,
        userId: otherUserId, // belongs to someone else
      });

      await expect(
        resultsService.getResultByAttempt(userId, attemptId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when attempt is in-progress (result is null)', async () => {
      mockPrisma.client.testAttempt.findUnique.mockResolvedValue({
        id: attemptId,
        userId,
        result: null, // still in progress
      });

      await expect(
        resultsService.getResultByAttempt(userId, attemptId),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns completed result enriched with bookmarkedQuestionIds', async () => {
      const mockAttempt = {
        id: attemptId,
        userId,
        test: {
          sections: [
            {
              testQuestions: [
                { question: { id: 'q-1' } },
                { question: { id: 'q-2' } },
              ],
            },
          ],
        },
        result: {
          id: 'res-1',
          totalScore: 88,
          accuracyPercent: 90,
          subjectBreakdown: [],
          topicBreakdown: [],
        },
        answers: [],
      };

      mockPrisma.client.testAttempt.findUnique.mockResolvedValue(mockAttempt);
      mockPrisma.client.bookmark.findMany.mockResolvedValue([{ questionId: 'q-1' }]);

      const result = await resultsService.getResultByAttempt(userId, attemptId);

      expect(result.id).toBe(attemptId);
      expect(result.result.totalScore).toBe(88);
      expect(result.bookmarkedQuestionIds).toEqual(['q-1']);
      expect(mockPrisma.client.bookmark.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          questionId: { in: ['q-1', 'q-2'] },
        },
        select: { questionId: true },
      });
    });
  });

  describe('listUserResults', () => {
    it('queries and returns user completed test results', async () => {
      const mockResults = [
        {
          id: 'res-1',
          totalScore: 75.5,
          accuracyPercent: 80,
          attempt: {
            id: attemptId,
            startedAt: new Date(),
            submittedAt: new Date(),
            timeSpentSeconds: 3600,
            test: { id: 't-1', title: 'CDS Mock 1', slug: 'cds-mock-1', totalMarks: 100 },
          },
        },
      ];

      mockPrisma.client.result.findMany.mockResolvedValue(mockResults);

      const list = await resultsService.listUserResults(userId);
      expect(list).toHaveLength(1);
      expect(mockPrisma.client.result.findMany).toHaveBeenCalledWith({
        where: { attempt: { userId } },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });
});
