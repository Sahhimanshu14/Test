import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MistakesService } from '../src/mistakes/mistakes.service';
import { MistakeStatus } from '@cdsprep/types';
import { NotFoundException } from '@nestjs/common';

describe('Mistakes Notebook Service Suite', () => {
  let mistakesService: MistakesService;
  let mockPrisma: any;

  const userId = 'cadet-user-01';
  const otherUserId = 'cadet-user-attacker';
  const mistakeId = 'mistake-01';
  const questionId = 'q-cds-gk-01';

  beforeEach(() => {
    mockPrisma = {
      client: {
        mistake: {
          findMany: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        attemptAnswer: {
          findMany: vi.fn(),
        },
        practiceAnswer: {
          findMany: vi.fn(),
        },
        bookmark: {
          findMany: vi.fn(),
        },
      },
    };

    mistakesService = new MistakesService(mockPrisma);
  });

  describe('listMistakes', () => {
    it('returns empty array when user has recorded no mistakes', async () => {
      mockPrisma.client.mistake.findMany.mockResolvedValue([]);
      const result = await mistakesService.listMistakes(userId);
      expect(result).toEqual([]);
      expect(mockPrisma.client.attemptAnswer.findMany).not.toHaveBeenCalled();
    });

    it('returns enriched mistakes with user-selected option, correct option, and bookmark status', async () => {
      const mockQuestion = {
        id: questionId,
        questionText: 'Which article deals with Right to Equality?',
        options: [
          { id: 'opt-14', identifier: 'A', optionText: 'Article 14', isCorrect: true, orderIndex: 1 },
          { id: 'opt-19', identifier: 'B', optionText: 'Article 19', isCorrect: false, orderIndex: 2 },
        ],
        explanation: { content: 'Articles 14-18 govern Right to Equality' },
        subject: { id: 's-polity', name: 'Indian Polity', slug: 'polity' },
        chapter: { id: 'c-fr', name: 'Fundamental Rights', slug: 'fr' },
        topic: { id: 't-equality', name: 'Right to Equality', slug: 'equality' },
      };

      mockPrisma.client.mistake.findMany.mockResolvedValue([
        {
          id: mistakeId,
          userId,
          questionId,
          status: MistakeStatus.ACTIVE,
          errorCount: 2,
          lastMistakeAt: new Date(),
          question: mockQuestion,
        },
      ]);

      mockPrisma.client.attemptAnswer.findMany.mockResolvedValue([
        {
          questionId,
          selectedOptionId: 'opt-19',
          createdAt: new Date(),
        },
      ]);
      mockPrisma.client.practiceAnswer.findMany.mockResolvedValue([]);
      mockPrisma.client.bookmark.findMany.mockResolvedValue([{ questionId }]);

      const result = await mistakesService.listMistakes(userId, MistakeStatus.ACTIVE);
      expect(result).toHaveLength(1);
      expect(result[0].userSelectedOption?.id).toBe('opt-19');
      expect(result[0].correctOption?.id).toBe('opt-14');
      expect(result[0].isBookmarked).toBe(true);
    });
  });

  describe('updateMistakeStatus & IDOR enforcement', () => {
    it('updates status and careless flag for authorized user', async () => {
      mockPrisma.client.mistake.findUnique.mockResolvedValue({
        id: mistakeId,
        userId,
        status: MistakeStatus.ACTIVE,
      });

      mockPrisma.client.mistake.update.mockResolvedValue({
        id: mistakeId,
        userId,
        status: MistakeStatus.REVIEWING,
        isCareless: true,
      });

      const updated = await mistakesService.updateMistakeStatus(
        userId,
        mistakeId,
        MistakeStatus.REVIEWING,
        true,
      );

      expect(updated.status).toBe(MistakeStatus.REVIEWING);
      expect(updated.isCareless).toBe(true);
      expect(mockPrisma.client.mistake.update).toHaveBeenCalledWith({
        where: { id: mistakeId },
        data: {
          status: MistakeStatus.REVIEWING,
          isCareless: true,
        },
      });
    });

    it('throws NotFoundException when mistake is non-existent', async () => {
      mockPrisma.client.mistake.findUnique.mockResolvedValue(null);

      await expect(
        mistakesService.updateMistakeStatus(userId, 'non-existent', MistakeStatus.MASTERED),
      ).rejects.toThrow(NotFoundException);
    });

    it('enforces IDOR prevention: throws NotFoundException when another user attempts modification', async () => {
      mockPrisma.client.mistake.findUnique.mockResolvedValue({
        id: mistakeId,
        userId, // belongs to cadet-user-01
      });

      await expect(
        mistakesService.updateMistakeStatus(otherUserId, mistakeId, MistakeStatus.MASTERED),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.client.mistake.update).not.toHaveBeenCalled();
    });
  });

  describe('markMastered', () => {
    it('transitions mistake status to MASTERED', async () => {
      mockPrisma.client.mistake.findUnique.mockResolvedValue({
        id: mistakeId,
        userId,
        status: MistakeStatus.ACTIVE,
      });

      mockPrisma.client.mistake.update.mockResolvedValue({
        id: mistakeId,
        userId,
        status: MistakeStatus.MASTERED,
      });

      const res = await mistakesService.markMastered(userId, mistakeId);
      expect(res.status).toBe(MistakeStatus.MASTERED);
      expect(mockPrisma.client.mistake.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: MistakeStatus.MASTERED },
        }),
      );
    });
  });
});
