import { Injectable, Inject } from '@nestjs/common';
import { SearchEngine, SEARCH_ENGINE_PROVIDER } from './search-engine.interface';
import { SearchQueryDto, SearchResponseDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_ENGINE_PROVIDER)
    private readonly searchEngine: SearchEngine,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.searchEngine.search(query);
  }
}
