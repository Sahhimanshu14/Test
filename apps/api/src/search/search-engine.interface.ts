import { SearchQueryDto, SearchResponseDto } from './dto/search.dto';

export const SEARCH_ENGINE_PROVIDER = 'SEARCH_ENGINE_PROVIDER';

export interface SearchEngine {
  search(query: SearchQueryDto): Promise<SearchResponseDto>;
  index?(entityType: string, entityId: string, data: Record<string, unknown>): Promise<void>;
  deleteIndex?(entityType: string, entityId: string): Promise<void>;
}
