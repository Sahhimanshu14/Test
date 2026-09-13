import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel } from '@cdsprep/types';

export enum SearchEntityType {
  ALL = 'ALL',
  QUESTIONS = 'QUESTIONS',
  TOPICS = 'TOPICS',
  CHAPTERS = 'CHAPTERS',
  PYQ = 'PYQ',
  TESTS = 'TESTS',
}

export class SearchQueryDto {
  @ApiProperty({ description: 'Search keywords or phrases' })
  q!: string;

  @ApiPropertyOptional({ enum: SearchEntityType, default: SearchEntityType.ALL })
  entityType?: SearchEntityType = SearchEntityType.ALL;

  @ApiPropertyOptional({ description: 'Filter by subject slug or name' })
  subject?: string;

  @ApiPropertyOptional({ description: 'Filter by topic slug or name' })
  topic?: string;

  @ApiPropertyOptional({ enum: DifficultyLevel, description: 'Filter by difficulty' })
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Filter by exam year' })
  year?: number;

  @ApiPropertyOptional({ default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  limit?: number = 20;
}

export interface SearchMatchSnippet {
  id: string;
  type: SearchEntityType;
  title: string;
  snippet: string;
  url: string;
  meta: {
    subject?: string;
    chapter?: string;
    topic?: string;
    difficulty?: string;
    year?: number;
    score?: number;
  };
}

export class SearchResponseDto {
  query!: string;
  totalMatches!: number;
  facets!: {
    questionsCount: number;
    topicsCount: number;
    chaptersCount: number;
    pyqCount: number;
    testsCount: number;
  };
  results!: SearchMatchSnippet[];
}
