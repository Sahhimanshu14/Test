import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookmarksService } from '../src/bookmarks/bookmarks.service';
import { NotFoundException } from '@nestjs/common';

describe('Bookmarks Service Suite', () => {
  let bookmarksService: BookmarksService;
  let mockPrisma: any;

  const userId = 'cadet-user-01';
  const questionId = 'q-cds-gk-01';

  beforeEach(() => {
    mockPrisma = {
      client: {
        bookmark: {
          findMany: vi.fn(),
          findUnique: vi.fn(),
          create: vi.fn(),
          delete: vi.fn(),
        },
      },
    };

    bookmarksService = new BookmarksService(mockPrisma);
  });

  describe('listBookmarks', () => {
    it('returns empty array when user has no bookmarks', async () => {
      mockPrisma.client.bookmark.findMany.mockResolvedValue([]);
      const result = await bookmarksService.listBookmarks(userId);
      expect(result).toEqual([]);
      expect(mockPrisma.client.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('filters bookmarks by subjectId when provided', async () => {
      const subjectId = 'subj-history-01';
      mockPrisma.client.bookmark.findMany.mockResolvedValue([
        {
          id: 'bm-1',
          userId,
          questionId,
          question: { id: questionId, subjectId },
        },
      ]);

      const result = await bookmarksService.listBookmarks(userId, subjectId);
      expect(result).toHaveLength(1);
      expect(mockPrisma.client.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            question: { subjectId },
          },
        }),
      );
    });

    it('filters bookmarks with search term on questionText', async () => {
      mockPrisma.client.bookmark.findMany.mockResolvedValue([]);
      await bookmarksService.listBookmarks(userId, undefined, 'Fundamental Rights');

      expect(mockPrisma.client.bookmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            question: {
              questionText: { contains: 'Fundamental Rights', mode: 'insensitive' },
            },
          },
        }),
      );
    });
  });

  describe('toggleBookmark', () => {
    it('creates a new bookmark when none exists (toggle ON)', async () => {
      mockPrisma.client.bookmark.findUnique.mockResolvedValue(null);
      mockPrisma.client.bookmark.create.mockResolvedValue({
        id: 'bm-new',
        userId,
        questionId,
        notes: 'Review before exam',
      });

      const result = await bookmarksService.toggleBookmark(userId, questionId, 'Review before exam');
      expect(result.isBookmarked).toBe(true);
      expect(result.bookmark).toBeDefined();
      expect(mockPrisma.client.bookmark.create).toHaveBeenCalledWith({
        data: {
          userId,
          questionId,
          notes: 'Review before exam',
        },
      });
    });

    it('deletes the existing bookmark when already present (toggle OFF)', async () => {
      mockPrisma.client.bookmark.findUnique.mockResolvedValue({
        id: 'bm-existing',
        userId,
        questionId,
      });
      mockPrisma.client.bookmark.delete.mockResolvedValue({ id: 'bm-existing' });

      const result = await bookmarksService.toggleBookmark(userId, questionId);
      expect(result.isBookmarked).toBe(false);
      expect(result.bookmark).toBeUndefined();
      expect(mockPrisma.client.bookmark.delete).toHaveBeenCalledWith({
        where: { id: 'bm-existing' },
      });
    });
  });

  describe('removeBookmark', () => {
    it('deletes bookmark if found', async () => {
      mockPrisma.client.bookmark.findUnique.mockResolvedValue({
        id: 'bm-found',
        userId,
        questionId,
      });
      mockPrisma.client.bookmark.delete.mockResolvedValue({ id: 'bm-found' });

      const result = await bookmarksService.removeBookmark(userId, questionId);
      expect(result.success).toBe(true);
      expect(mockPrisma.client.bookmark.delete).toHaveBeenCalledWith({
        where: { id: 'bm-found' },
      });
    });

    it('throws NotFoundException when removing a non-existent bookmark', async () => {
      mockPrisma.client.bookmark.findUnique.mockResolvedValue(null);

      await expect(
        bookmarksService.removeBookmark(userId, 'non-existent-q'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
