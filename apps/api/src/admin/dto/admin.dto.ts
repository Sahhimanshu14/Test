import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType, AcademyTarget, QuestionStatus, ReportStatus } from '@cdsprep/types';

export class UserFilterQueryDto {
  @ApiPropertyOptional({ default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search term for name or email' })
  search?: string;

  @ApiPropertyOptional({ enum: RoleType, description: 'Filter by role' })
  role?: RoleType;

  @ApiPropertyOptional({ enum: AcademyTarget, description: 'Filter by target academy' })
  academy?: AcademyTarget;

  @ApiPropertyOptional({ description: 'Filter by email verification status' })
  isVerified?: boolean;
}

export enum AccountModerationAction {
  SUSPEND = 'SUSPEND',
  ACTIVATE = 'ACTIVATE',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: AccountModerationAction, description: 'Moderation action to apply' })
  action!: AccountModerationAction;

  @ApiPropertyOptional({ description: 'Reason for the administrative action' })
  reason?: string;
}

export class AssignRoleDto {
  @ApiProperty({ enum: RoleType, description: 'Target role to assign' })
  role!: RoleType;
}

export class ReportFilterQueryDto {
  @ApiPropertyOptional({ default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ReportStatus, description: 'Filter by report status' })
  status?: ReportStatus;
}

export enum ReportResolutionAction {
  RESOLVE = 'RESOLVE',
  REJECT = 'REJECT',
}

export class ResolveReportDto {
  @ApiProperty({ enum: ReportResolutionAction, description: 'Resolution outcome' })
  action!: ReportResolutionAction;

  @ApiPropertyOptional({ description: 'Resolution notes or remarks' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Optional question remediation fix and republish instruction',
  })
  questionFix?: {
    questionText?: string;
    options?: Array<{ identifier: string; optionText: string; isCorrect: boolean }>;
    explanation?: string;
    republish?: boolean;
  };
}

export class CreateSubjectAdminDto {
  @ApiProperty({ description: 'URL-friendly unique slug (e.g. english, general-knowledge)' })
  slug!: string;

  @ApiProperty({ description: 'Subject title' })
  name!: string;

  @ApiPropertyOptional({ description: 'Detailed subject description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Lucide icon identifier' })
  icon?: string;

  @ApiPropertyOptional({ default: 0, description: 'Display order index' })
  orderIndex?: number = 0;
}

export class CreateChapterAdminDto {
  @ApiProperty({ description: 'Parent Subject UUID' })
  subjectId!: string;

  @ApiProperty({ description: 'Chapter title' })
  name!: string;

  @ApiProperty({ description: 'Chapter URL-friendly slug' })
  slug!: string;

  @ApiPropertyOptional({ default: 0, description: 'Display order index' })
  orderIndex?: number = 0;
}

export class CreateTopicAdminDto {
  @ApiProperty({ description: 'Parent Chapter UUID' })
  chapterId!: string;

  @ApiProperty({ description: 'Topic title' })
  name!: string;

  @ApiProperty({ description: 'Topic URL-friendly slug' })
  slug!: string;

  @ApiPropertyOptional({ default: 0, description: 'Display order index' })
  orderIndex?: number = 0;
}

export class BatchApproveAiQuestionsDto {
  @ApiProperty({ description: 'Array of Question UUIDs to approve', type: [String] })
  questionIds!: string[];

  @ApiPropertyOptional({
    enum: QuestionStatus,
    default: QuestionStatus.APPROVED,
    description: 'Target question status',
  })
  targetStatus?: QuestionStatus = QuestionStatus.APPROVED;
}

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ description: 'Examination maintenance mode toggle' })
  maintenanceMode?: boolean;

  @ApiPropertyOptional({ description: 'Default negative marking multiplier (e.g. 0.33)' })
  defaultNegativeMarking?: number;

  @ApiPropertyOptional({ description: 'Exam attempt grace period in seconds' })
  timerGracePeriodSeconds?: number;

  @ApiPropertyOptional({ description: 'AI generation daily batch quota' })
  aiDailyGenerationLimit?: number;
}
