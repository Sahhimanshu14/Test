import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel, QuestionType, QuestionStatus } from '@cdsprep/types';

export enum ExplanationModeDtoEnum {
  EXPLAIN = 'explain',
  SIMPLE = 'simple',
  DETAILED = 'detailed',
  WHY_CORRECT = 'why_correct',
  WHY_WRONG = 'why_wrong',
  SIMILAR_QUESTION = 'similar_question',
}

export enum StudyAssistantQueryDtoEnum {
  STUDY_TODAY = 'study_today',
  WEAKEST_TOPIC = 'weakest_topic',
  REVISION_PLAN = 'revision_plan',
  PERFORMANCE_TREND = 'performance_trend',
  SIMILAR_PRACTICE = 'similar_practice',
  GENERAL_ADVICE = 'general_advice',
}

export class ExplainQuestionDto {
  @ApiProperty({ description: 'Target question UUID to be explained' })
  questionId!: string;

  @ApiPropertyOptional({
    enum: ExplanationModeDtoEnum,
    default: ExplanationModeDtoEnum.EXPLAIN,
    description: 'Educational explanation mode',
  })
  mode?: ExplanationModeDtoEnum = ExplanationModeDtoEnum.EXPLAIN;

  @ApiPropertyOptional({ description: 'Optional specific student query or area of confusion' })
  query?: string;
}

export class StudyAssistantQueryDto {
  @ApiPropertyOptional({
    enum: StudyAssistantQueryDtoEnum,
    default: StudyAssistantQueryDtoEnum.STUDY_TODAY,
    description: 'Study advisor intent',
  })
  queryType?: StudyAssistantQueryDtoEnum = StudyAssistantQueryDtoEnum.STUDY_TODAY;

  @ApiPropertyOptional({ description: 'Optional custom question or target focus' })
  message?: string;
}

export class AdminGenerateQuestionsDto {
  @ApiProperty({ description: 'Subject UUID' })
  subjectId!: string;

  @ApiPropertyOptional({ description: 'Chapter UUID' })
  chapterId?: string;

  @ApiProperty({ description: 'Topic UUID' })
  topicId!: string;

  @ApiPropertyOptional({ enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' })
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';

  @ApiPropertyOptional({ enum: ['MCQ', 'NUMERICAL'], default: 'MCQ' })
  questionType?: 'MCQ' | 'NUMERICAL' = 'MCQ';

  @ApiPropertyOptional({ default: 2, minimum: 1, maximum: 10 })
  count?: number = 2;
}

export class CandidateGeneratedOptionDto {
  @ApiProperty({ example: 'A' })
  identifier!: string;

  @ApiProperty({ example: '150 meters' })
  text!: string;
}

export class CandidateGeneratedQuestionDto {
  @ApiProperty({ example: 'A train takes 20s to cross a 150m platform...' })
  questionText!: string;

  @ApiProperty({ type: [CandidateGeneratedOptionDto] })
  options!: CandidateGeneratedOptionDto[];

  @ApiProperty({ example: 'B' })
  correctAnswer!: string;

  @ApiProperty({ example: 'Speed = 15 m/s. Distance = 300 m...' })
  explanation!: string;

  @ApiPropertyOptional({ default: 'MCQ' })
  questionType?: string;

  @ApiPropertyOptional({ default: 'MEDIUM' })
  difficulty?: string;
}

export class AdminSaveGeneratedQuestionsDto {
  @ApiProperty()
  subjectId!: string;

  @ApiProperty()
  chapterId!: string;

  @ApiProperty()
  topicId!: string;

  @ApiProperty({ type: [CandidateGeneratedQuestionDto] })
  questions!: CandidateGeneratedQuestionDto[];
}
