import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePYQPaperDto {
  @ApiProperty({ example: 2023 })
  year!: number;

  @ApiProperty({ example: 'I', description: 'Exam Session, e.g. I or II' })
  session!: string;

  @ApiPropertyOptional({ example: 'CDS', default: 'CDS' })
  exam?: string;

  @ApiProperty({ example: 'elementary-maths' })
  subjectSlug!: string;

  @ApiPropertyOptional()
  subjectId?: string;

  @ApiProperty({ example: 'CDS I 2023 — Elementary Mathematics Official Paper' })
  title!: string;

  @ApiPropertyOptional({ default: 100.0 })
  totalMarks?: number;

  @ApiPropertyOptional({ default: 120 })
  durationMin?: number;

  @ApiProperty({ example: 'Union Public Service Commission (UPSC) Official Archive' })
  source!: string;

  @ApiPropertyOptional({ example: 'https://upsc.gov.in/examinations/previous-question-papers' })
  sourceUrl?: string;

  @ApiPropertyOptional({
    default: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
    example: 'PUBLIC_DOMAIN_GOVERNMENT_DOCUMENTS',
  })
  licenseType?: string;

  @ApiProperty({
    example:
      'Official Question Paper published by UPSC for Combined Defence Services Examination. Reproduced for educational preparation under fair dealing provisions.',
  })
  attribution!: string;

  @ApiPropertyOptional()
  licenseMetadata?: Record<string, any>;

  @ApiPropertyOptional({ default: false })
  isPublished?: boolean;
}

export class UpdatePYQPaperDto {
  @ApiPropertyOptional({ example: 2023 })
  year?: number;

  @ApiPropertyOptional({ example: 'I' })
  session?: string;

  @ApiPropertyOptional({ example: 'CDS' })
  exam?: string;

  @ApiPropertyOptional({ example: 'elementary-maths' })
  subjectSlug?: string;

  @ApiPropertyOptional()
  subjectId?: string;

  @ApiPropertyOptional({ example: 'Updated Title' })
  title?: string;

  @ApiPropertyOptional({ default: 100.0 })
  totalMarks?: number;

  @ApiPropertyOptional({ default: 120 })
  durationMin?: number;

  @ApiPropertyOptional()
  source?: string;

  @ApiPropertyOptional()
  sourceUrl?: string;

  @ApiPropertyOptional()
  licenseType?: string;

  @ApiPropertyOptional()
  attribution?: string;

  @ApiPropertyOptional()
  licenseMetadata?: Record<string, any>;

  @ApiPropertyOptional()
  isPublished?: boolean;
}

export class MapQuestionItemDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  questionId!: string;

  @ApiProperty({ example: 1 })
  questionNumber!: number;
}

export class MapPYQQuestionsDto {
  @ApiProperty({ type: [MapQuestionItemDto] })
  questions!: MapQuestionItemDto[];
}

export class PYQFilterQueryDto {
  @ApiPropertyOptional({ example: 2023 })
  year?: number;

  @ApiPropertyOptional({ example: 'I' })
  session?: string;

  @ApiPropertyOptional({ example: 'CDS' })
  exam?: string;

  @ApiPropertyOptional({ example: 'elementary-maths' })
  subjectSlug?: string;

  @ApiPropertyOptional()
  subjectId?: string;

  @ApiPropertyOptional()
  topicId?: string;

  @ApiPropertyOptional()
  search?: string;

  @ApiPropertyOptional()
  isPublished?: boolean;
}

export class BulkImportPYQDto {
  @ApiProperty({ type: CreatePYQPaperDto })
  paper!: CreatePYQPaperDto;

  @ApiProperty({ type: [Object], description: 'Array of question payloads with options & explanations' })
  questions!: any[];
}
