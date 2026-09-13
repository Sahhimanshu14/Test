import {
  SearchProvider,
  SearchQuery,
  SearchResult,
  SearchResultItem,
  SearchDocument,
} from './provider.interface';

export class MockSearchProvider implements SearchProvider {
  readonly providerName = 'mock';
  private readonly documents = new Map<string, SearchDocument>();

  async index(document: SearchDocument): Promise<void> {
    this.documents.set(document.id, document);
  }

  async deleteIndex(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize || 20));
    const term = (query.term || '').toLowerCase().trim();

    const matchedItems: SearchResultItem[] = [];

    for (const doc of this.documents.values()) {
      // 1. Filter matching
      if (query.filters) {
        if (query.filters.subjectId && doc.filters?.subjectId !== query.filters.subjectId) {
          continue;
        }
        if (query.filters.difficulty && doc.filters?.difficulty !== query.filters.difficulty) {
          continue;
        }
        if (query.filters.type && doc.filters?.type !== query.filters.type) {
          continue;
        }
      }

      // 2. Term matching
      const inTitle = doc.title.toLowerCase().includes(term);
      const inContent = doc.content.toLowerCase().includes(term);

      if (!term || inTitle || inContent) {
        let score = 0.5;
        if (inTitle) score += 0.4;
        if (inContent) score += 0.2;

        const snippetIndex = term ? doc.content.toLowerCase().indexOf(term) : 0;
        const start = Math.max(0, snippetIndex - 30);
        const snippet = doc.content.slice(start, start + 100);

        matchedItems.push({
          id: doc.id,
          title: doc.title,
          snippet,
          score,
          metadata: doc.metadata,
        });
      }
    }

    matchedItems.sort((a, b) => (b.score || 0) - (a.score || 0));

    const total = matchedItems.length;
    const paginated = matchedItems.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      durationMs: Date.now() - startTime,
    };
  }

  clear(): void {
    this.documents.clear();
  }
}
