import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from '../src/search/search.service';
import { SearchEngine } from '../src/search/search-engine.interface';
import { SearchEntityType, SearchResponseDto } from '../src/search/dto/search.dto';

describe('Search Subsystem', () => {
  let searchService: SearchService;
  let mockEngine: SearchEngine;

  const sampleResults: SearchResponseDto = {
    query: 'trigonometry',
    total: 3,
    page: 1,
    limit: 20,
    results: [
      {
        id: 'q-101',
        entityType: SearchEntityType.QUESTION,
        title: 'Trigonometric Identities & Heights',
        snippet: 'Find the height of a tower when the angle of elevation...',
        subject: 'Elementary Mathematics',
        topic: 'Heights and Distances',
        year: 2023,
        difficulty: 'MEDIUM',
        metadata: { questionType: 'MCQ' },
      },
      {
        id: 'top-202',
        entityType: SearchEntityType.TOPIC,
        title: 'Trigonometry & Applications',
        snippet: 'Chapter covering fundamental identities, sine rule and heights...',
        subject: 'Elementary Mathematics',
        topic: 'Trigonometry',
      },
      {
        id: 'test-303',
        entityType: SearchEntityType.MOCK_TEST,
        title: 'CDS Mathematics Trigonometry Sectional Mock',
        snippet: 'Comprehensive 50-question mock test on trigonometry and geometry...',
        subject: 'Elementary Mathematics',
      },
    ],
    facets: {
      byType: {
        [SearchEntityType.QUESTION]: 1,
        [SearchEntityType.TOPIC]: 1,
        [SearchEntityType.MOCK_TEST]: 1,
      },
      bySubject: {
        'Elementary Mathematics': 3,
      },
    },
  };

  beforeEach(() => {
    mockEngine = {
      search: vi.fn().mockResolvedValue(sampleResults),
    };

    searchService = new SearchService(mockEngine);
  });

  it('delegates search query to injected SearchEngine abstraction', async () => {
    const queryDto = { q: 'trigonometry', page: 1, limit: 20 };
    const res = await searchService.search(queryDto);

    expect(mockEngine.search).toHaveBeenCalledWith(queryDto);
    expect(res.total).toBe(3);
    expect(res.results).toHaveLength(3);
    expect(res.facets.bySubject['Elementary Mathematics']).toBe(3);
  });

  it('correctly passes filters (type, subject, difficulty, year) to the search engine', async () => {
    const queryDto = {
      q: 'trigonometry',
      type: SearchEntityType.QUESTION,
      subject: 'Elementary Mathematics',
      difficulty: 'MEDIUM' as const,
      year: 2023,
      page: 1,
      limit: 10,
    };

    await searchService.search(queryDto);
    expect(mockEngine.search).toHaveBeenCalledWith(queryDto);
  });
});
