import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleType } from '@cdsprep/types';
import {
  ExplainQuestionDto,
  StudyAssistantQueryDto,
  AdminGenerateQuestionsDto,
  AdminSaveGeneratedQuestionsDto,
} from './dto/ai.dto';

@ApiTags('AI Study Assistant & Content Generation')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('explain')
  @ApiOperation({ summary: 'Request contextual AI-assisted explanation with math verification across 6 pedagogical modes' })
  @SwaggerResponse({ status: 200, description: 'AI explanation generated with verification status' })
  async explainQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExplainQuestionDto,
  ) {
    return this.aiService.explainQuestion(user.id, dto);
  }

  @Post('assistant')
  @ApiOperation({ summary: 'Request personalized study advice and revision plans from AI Cadet Advisor' })
  @SwaggerResponse({ status: 200, description: 'Structured advice and recommended drill actions returned' })
  async askStudyAssistant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StudyAssistantQueryDto,
  ) {
    return this.aiService.askStudyAssistant(user.id, dto);
  }

  @Post('admin/generate-questions')
  @Roles(RoleType.CONTENT_EDITOR, RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin workflow: Draft candidate questions with schema, math & duplicate verification' })
  @SwaggerResponse({ status: 200, description: 'Candidate questions generated for admin review (not published)' })
  async generateQuestionsForAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AdminGenerateQuestionsDto,
  ) {
    return this.aiService.generateQuestionsForAdmin(user, dto);
  }

  @Post('admin/save-questions')
  @Roles(RoleType.CONTENT_EDITOR, RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin workflow: Commit approved candidate questions to question bank as DRAFT' })
  @SwaggerResponse({ status: 201, description: 'Questions committed to database in DRAFT status' })
  async saveApprovedQuestions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AdminSaveGeneratedQuestionsDto,
  ) {
    return this.aiService.saveApprovedQuestions(user, dto);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'List personalized study recommendations generated for student' })
  @SwaggerResponse({ status: 200, description: 'Recommendations returned' })
  async listRecommendations(@CurrentUser() user: AuthenticatedUser) {
    return this.aiService.listRecommendations(user.id);
  }
}
