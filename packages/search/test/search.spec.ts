import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MockSearchProvider,
  OpenSearchProvider,
  getSearchEngineProvider,
} from '../src';

describe('Search Engine System (@cdsprep/search)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('MockSearchProvider', () => {
    it('indexes documents and performs term and filter searches', async () => {
      const provider = new MockSearchProvider();

      await provider.index({
        id: 'q-1',
        title: 'Newton First Law of Motion',
        content: 'An object at rest stays at rest unless acted upon by an external force.',
        filters: { subjectId: 'physics', difficulty: 'EASY' },
      });

      await provider.index({
        id: 'q-2',
        title: 'Fundamental Rights Article 21',
        content: 'Protection of life and personal liberty under the Indian Constitution.',
        filters: { subjectId: 'polity', difficulty: 'MEDIUM' },
      });

      // Search by term
      const res1 = await provider.search({ term: 'Newton' });
      expect(res1.total).toBe(1);
      expect(res1.items[0]?.id).toBe('q-1');

      // Search by filter
      const res2 = await provider.search({ term: '', filters: { subjectId: 'polity' } });
      expect(res2.total).toBe(1);
      expect(res2.items[0]?.id).toBe('q-2');

      // Search with pagination
      const res3 = await provider.search({ term: '', page: 1, pageSize: 1 });
      expect(res3.items).toHaveLength(1);
      expect(res3.total).toBe(2);

      // Deletion
      await provider.deleteIndex('q-1');
      const res4 = await provider.search({ term: 'Newton' });
      expect(res4.total).toBe(0);
    });
  });

  describe('OpenSearchProvider', () => {
    it('throws when initialized without an endpoint', () => {
      expect(() => new OpenSearchProvider({ endpoint: '' })).toThrowError(/requires a valid endpoint/);
    });

    it('formats search request and parses hits correctly', async () => {
      const mockEsResponse = {
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'q-101',
              _score: 1.85,
              _source: {
                title: 'Indian National Movement 1857',
                content: 'The revolt of 1857 was a major uprising in India...',
                metadata: { year: 2023 },
              },
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockEsResponse,
      } as Response);

      const provider = new OpenSearchProvider({
        endpoint: 'https://search-cdsprep.us-east-1.es.amazonaws.com',
      });

      const res = await provider.search({
        term: 'revolt 1857',
        filters: { difficulty: 'HARD' },
      });

      expect(res.total).toBe(1);
      expect(res.items[0]?.id).toBe('q-101');
      expect(res.items[0]?.title).toBe('Indian National Movement 1857');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://search-cdsprep.us-east-1.es.amazonaws.com/cdsprep-questions/_search',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('getSearchEngineProvider Factory', () => {
    it('returns MockSearchProvider for mock or postgres default', () => {
      const p1 = getSearchEngineProvider();
      expect(p1.providerName).toBe('mock');

      const p2 = getSearchEngineProvider({ provider: 'mock' });
      expect(p2.providerName).toBe('mock');
    });

    it('returns OpenSearchProvider when configured', () => {
      const p = getSearchEngineProvider({
        provider: 'opensearch',
        opensearchConfig: { endpoint: 'https://opensearch.example.com' },
      });
      expect(p.providerName).toBe('opensearch');
    });

    it('throws when opensearch requested without endpoint', () => {
      expect(() => getSearchEngineProvider({ provider: 'opensearch' })).toThrowError(/endpoint/);
    });
  });
});
