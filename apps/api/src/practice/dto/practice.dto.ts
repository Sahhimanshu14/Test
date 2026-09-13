import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PracticeMode, DifficultyLevel } from '@cdsprep/types';

export class CreatePracticeSessionDto {
  @ApiPropertyOptional({ enum: PracticeMode, default: PracticeMode.ALL_QUESTIONS })
  mode?: PracticeMode;

  @ApiPropertyOptional({ description: 'Optional subject filter ID' })
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Optional chapter filter ID' })
  chapterId?: string;

  @ApiPropertyOptional({ description: 'Optional topic filter ID' })
  topicId?: string;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  questionCount?: number;

  @ApiPropertyOptional({ default: true })
  randomize?: boolean;

  @ApiPropertyOptional({ description: 'Optional time limit in minutes' })
  timeLimitMinutes?: number;

  @ApiPropertyOptional({ default: false, description: 'Whether incorrect answers deduct marks' })
  enableNegativeMarking?: boolean;
}

export class SubmitPracticeAnswerDto {
  @ApiProperty({ description: 'Question UUID' })
  questionId!: string;

  @ApiPropertyOptional({ description: 'Option UUID or null to clear response', nullable: true })
  selectedOptionId?: string | null;

  @ApiPropertyOptional({ default: 0, description: 'Seconds spent on this question' })
  timeSpentSeconds?: number;

  @ApiPropertyOptional({ default: false })
  isMarkedForReview?: boolean;
}

export class CreateQuestionReportDto {
  @ApiProperty({ description: 'Question UUID' })
  questionId!: string;

  @ApiProperty({ example: 'INCORRECT_ANSWER_KEY', description: 'Primary reason for the report' })
  reason!: string;

  @ApiPropertyOptional({ example: 'The correct answer should be Option B because...', description: 'Detailed feedback' })
  details?: string;
}

export class PracticeHistoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  limit?: number;
}
