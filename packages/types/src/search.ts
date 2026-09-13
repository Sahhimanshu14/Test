export enum SearchEntityType {
  QUESTION = 'QUESTION',
  TOPIC = 'TOPIC',
  CHAPTER = 'CHAPTER',
  PYQ = 'PYQ',
  MOCK_TEST = 'MOCK_TEST',
}

export interface SearchResultItem {
  id: string;
  entityType: SearchEntityType;
  title: string;
  snippet?: string;
  subject?: string;
  topic?: string;
  year?: number;
  difficulty?: string;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  query: string;
  total: number;
  page: number;
  limit: number;
  results: SearchResultItem[];
  facets: {
    byType: Record<string, number>;
    bySubject: Record<string, number>;
  };
}
