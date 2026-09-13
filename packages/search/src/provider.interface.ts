export interface SearchFilters {
  subjectId?: string;
  chapterId?: string;
  difficulty?: string;
  type?: string;
  isPyq?: boolean;
}

export interface SearchQuery {
  term: string;
  filters?: SearchFilters;
  page?: number;
  pageSize?: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  snippet?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  durationMs: number;
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  filters?: SearchFilters;
  metadata?: Record<string, unknown>;
}

export interface SearchProvider {
  readonly providerName: string;
  search(query: SearchQuery): Promise<SearchResult>;
  index(document: SearchDocument): Promise<void>;
  deleteIndex?(id: string): Promise<void>;
}
