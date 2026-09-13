import {
  SearchProvider,
  SearchQuery,
  SearchResult,
  SearchResultItem,
  SearchDocument,
} from './provider.interface';

export interface OpenSearchConfig {
  endpoint: string;
  indexName?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class OpenSearchProvider implements SearchProvider {
  readonly providerName = 'opensearch';
  private readonly endpoint: string;
  private readonly indexName: string;
  private readonly authHeader?: string;
  private readonly timeoutMs: number;

  constructor(config: OpenSearchConfig) {
    if (!config.endpoint) {
      throw new Error('OpenSearchProvider requires a valid endpoint URL');
    }
    this.endpoint = config.endpoint.replace(/\/+$/, '');
    this.indexName = config.indexName || 'cdsprep-questions';
    this.timeoutMs = config.timeoutMs || 5000;

    if (config.apiKey) {
      this.authHeader = `ApiKey ${config.apiKey}`;
    } else if (config.username && config.password) {
      const creds = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.authHeader = `Basic ${creds}`;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authHeader) {
      headers.Authorization = this.authHeader;
    }
    return headers;
  }

  async index(document: SearchDocument): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.endpoint}/${this.indexName}/_doc/${encodeURIComponent(document.id)}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(document),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OpenSearch indexing failed status ${res.status}: ${body}`);
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      throw err;
    }
  }

  async deleteIndex(id: string): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.endpoint}/${this.indexName}/_doc/${encodeURIComponent(id)}`;
      await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch (err: unknown) {
      clearTimeout(timer);
      throw err;
    }
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize || 20));
    const from = (page - 1) * pageSize;

    const mustClauses: Record<string, unknown>[] = [];

    if (query.term?.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.term.trim(),
          fields: ['title^2', 'content'],
          fuzziness: 'AUTO',
        },
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    const filterClauses: Record<string, unknown>[] = [];
    if (query.filters?.subjectId) {
      filterClauses.push({ term: { 'filters.subjectId': query.filters.subjectId } });
    }
    if (query.filters?.difficulty) {
      filterClauses.push({ term: { 'filters.difficulty': query.filters.difficulty } });
    }
    if (query.filters?.type) {
      filterClauses.push({ term: { 'filters.type': query.filters.type } });
    }

    const esQuery = {
      from,
      size: pageSize,
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses,
        },
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.endpoint}/${this.indexName}/_search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(esQuery),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OpenSearch search query failed status ${res.status}: ${body}`);
      }

      const data = (await res.json()) as {
        hits?: {
          total?: { value?: number } | number;
          hits?: Array<{
            _id: string;
            _score?: number;
            _source?: {
              title?: string;
              content?: string;
              metadata?: Record<string, unknown>;
            };
          }>;
        };
      };

      const rawTotal = data.hits?.total;
      const total = typeof rawTotal === 'number' ? rawTotal : rawTotal?.value || 0;

      const items: SearchResultItem[] = (data.hits?.hits || []).map((hit) => ({
        id: hit._id,
        title: hit._source?.title || 'Untitled',
        snippet: hit._source?.content?.slice(0, 120),
        score: hit._score,
        metadata: hit._source?.metadata,
      }));

      return {
        items,
        total,
        page,
        pageSize,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      throw err;
    }
  }
}
