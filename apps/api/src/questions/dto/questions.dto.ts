import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel, QuestionStatus, QuestionType } from '@cdsprep/types';

export class QuestionOptionDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiProperty({ example: 'A' })
  identifier!: string;

  @ApiProperty({ example: 'Equilateral triangle' })
  optionText!: string;

  @ApiPropertyOptional({ default: false })
  isCorrect?: boolean;

  @ApiPropertyOptional({ default: 0 })
  orderIndex?: number;
}

export class QuestionExplanationDto {
  @ApiProperty({ example: 'By properties of equilateral triangles...' })
  explanation!: string;

  @ApiPropertyOptional({ example: 'Geometric symmetries' })
  keyConcept?: string;

  @ApiPropertyOptional({ example: 'Area = (sqrt(3)/4)*s^2' })
  trickFormula?: string;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is the sum of angles in a triangle?' })
  questionText!: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  subjectId!: string;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  chapterId!: string;

  @ApiProperty({ example: '33333333-3333-3333-3333-333333333333' })
  topicId!: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  subtopicId?: string;

  @ApiPropertyOptional({ enum: QuestionType, default: QuestionType.MCQ_SINGLE })
  questionType?: QuestionType;

  @ApiPropertyOptional({ default: 1.0 })
  marks?: number;

  @ApiPropertyOptional({ default: 0.33 })
  negativeMarks?: number;

  @ApiPropertyOptional({ enum: DifficultyLevel, default: DifficultyLevel.MEDIUM })
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ enum: QuestionStatus, default: QuestionStatus.DRAFT })
  status?: QuestionStatus;

  @ApiPropertyOptional({ example: 'UPSC CDS 2023 I' })
  source?: string;

  @ApiPropertyOptional({ example: 2023 })
  year?: number;

  @ApiPropertyOptional({ example: 'CDS I' })
  exam?: string;

  @ApiPropertyOptional({ default: 'en' })
  language?: string;

  @ApiPropertyOptional({ type: [String], example: ['geometry', 'triangles'] })
  tags?: string[];

  @ApiPropertyOptional({ type: [QuestionOptionDto] })
  options?: QuestionOptionDto[];

  @ApiPropertyOptional({ type: QuestionExplanationDto })
  explanation?: QuestionExplanationDto;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  questionText?: string;

  @ApiPropertyOptional()
  subjectId?: string;

  @ApiPropertyOptional()
  chapterId?: string;

  @ApiPropertyOptional()
  topicId?: string;

  @ApiPropertyOptional()
  subtopicId?: string;

  @ApiPropertyOptional({ enum: QuestionType })
  questionType?: QuestionType;

  @ApiPropertyOptional()
  marks?: number;

  @ApiPropertyOptional()
  negativeMarks?: number;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ enum: QuestionStatus })
  status?: QuestionStatus;

  @ApiPropertyOptional()
  source?: string;

  @ApiPropertyOptional()
  year?: number;

  @ApiPropertyOptional()
  exam?: string;

  @ApiPropertyOptional()
  language?: string;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiPropertyOptional({ type: [QuestionOptionDto] })
  options?: QuestionOptionDto[];

  @ApiPropertyOptional({ type: QuestionExplanationDto })
  explanation?: QuestionExplanationDto;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  reviewedById?: string;

  @ApiPropertyOptional()
  verifiedAt?: Date;
}

export class QuestionQueryDto {
  @ApiPropertyOptional()
  subjectId?: string;

  @ApiPropertyOptional()
  chapterId?: string;

  @ApiPropertyOptional()
  topicId?: string;

  @ApiPropertyOptional()
  subtopicId?: string;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ enum: QuestionStatus })
  status?: QuestionStatus;

  @ApiPropertyOptional({ enum: QuestionType })
  questionType?: QuestionType;

  @ApiPropertyOptional()
  year?: number;

  @ApiPropertyOptional()
  exam?: string;

  @ApiPropertyOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  limit?: number;
}

export class UpdateQuestionStatusDto {
  @ApiProperty({ enum: QuestionStatus })
  status!: QuestionStatus;

  @ApiPropertyOptional({ example: 'Verified mathematically' })
  reason?: string;
}

export class BulkImportDto {
  @ApiPropertyOptional({
    description: 'Array of questions in JSON format',
  })
  data?: any[];

  @ApiPropertyOptional({
    description: 'Raw CSV string payload',
  })
  csvContent?: string;
}
