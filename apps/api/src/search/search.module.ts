import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PostgresSearchService } from './postgres-search.service';
import { SEARCH_ENGINE_PROVIDER } from './search-engine.interface';

@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    PostgresSearchService,
    {
      provide: SEARCH_ENGINE_PROVIDER,
      useClass: PostgresSearchService,
    },
  ],
  exports: [SearchService, SEARCH_ENGINE_PROVIDER],
})
export class SearchModule {}
