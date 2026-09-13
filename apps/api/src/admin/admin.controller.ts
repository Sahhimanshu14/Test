import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleType, QuestionStatus } from '@cdsprep/types';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  UserFilterQueryDto,
  UpdateUserStatusDto,
  AssignRoleDto,
  ReportFilterQueryDto,
  ResolveReportDto,
  CreateSubjectAdminDto,
  CreateChapterAdminDto,
  CreateTopicAdminDto,
  BatchApproveAiQuestionsDto,
  UpdateSystemSettingsDto,
} from './dto/admin.dto';
import { Request } from 'express';

@ApiTags('Admin Console & Operations')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ---------------------------------------------------------------------------
  // Telemetry & Metrics
  // ---------------------------------------------------------------------------
  @Get('metrics')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN)
  @ApiOperation({ summary: 'Platform operational metrics and counts' })
  @SwaggerResponse({ status: 200, description: 'Live platform metrics' })
  async getMetrics() {
    return this.adminService.getPlatformMetrics();
  }

  @Get('content/stats')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER, RoleType.CONTENT_EDITOR)
  @ApiOperation({ summary: 'Real-time content administration metrics and quality analytics' })
  @SwaggerResponse({ status: 200, description: 'Content dashboard statistics' })
  async getContentStats() {
    return this.adminService.getContentDashboardStats();
  }

  // ---------------------------------------------------------------------------
  // User Directory & Moderation
  // ---------------------------------------------------------------------------
  @Get('users')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN)
  @ApiOperation({ summary: 'List and filter users' })
  async listUsers(@Query() query: UserFilterQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN)
  @ApiOperation({ summary: 'Get comprehensive user profile & audit history' })
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Post('users/:id/status')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN)
  @ApiOperation({ summary: 'Apply moderation action to user account' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.updateUserStatus(id, dto, user.id, req.ip);
  }

  @Post('users/:id/roles')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign staff role to user (Super Admin only)' })
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.assignRole(id, dto.role, user.id, req.ip);
  }

  @Delete('users/:id/roles/:role')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke staff role from user (Super Admin only)' })
  async revokeRole(
    @Param('id') id: string,
    @Param('role') role: RoleType,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.revokeRole(id, role, user.id, req.ip);
  }

  // ---------------------------------------------------------------------------
  // Question Reports Moderation
  // ---------------------------------------------------------------------------
  @Get('reports')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.MODERATOR)
  @ApiOperation({ summary: 'List cadet question reports' })
  async listReports(@Query() query: ReportFilterQueryDto) {
    return this.adminService.listReports(query);
  }

  @Patch('reports/:id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.MODERATOR)
  @ApiOperation({ summary: 'Resolve or reject candidate report' })
  async resolveReport(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.resolveReport(id, dto, user.id, req.ip);
  }

  // ---------------------------------------------------------------------------
  // Syllabus & Taxonomy Management
  // ---------------------------------------------------------------------------
  @Get('taxonomy')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER)
  @ApiOperation({ summary: 'List full taxonomy tree with question counts' })
  async listTaxonomy() {
    return this.adminService.listTaxonomy();
  }

  @Post('subjects')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER)
  @ApiOperation({ summary: 'Create new Subject' })
  async createSubject(
    @Body() dto: CreateSubjectAdminDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.createSubject(dto, user.id, req.ip);
  }

  @Post('chapters')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER)
  @ApiOperation({ summary: 'Create new Chapter' })
  async createChapter(
    @Body() dto: CreateChapterAdminDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.createChapter(dto, user.id, req.ip);
  }

  @Post('topics')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER)
  @ApiOperation({ summary: 'Create new Topic' })
  async createTopic(
    @Body() dto: CreateTopicAdminDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.createTopic(dto, user.id, req.ip);
  }

  // ---------------------------------------------------------------------------
  // Test Pre-Publish Validation
  // ---------------------------------------------------------------------------
  @Post('tests/:id/publish')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER)
  @ApiOperation({ summary: 'Validate test configuration and publish' })
  async validateAndPublishTest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.validateAndPublishTest(id, user.id, req.ip);
  }

  // ---------------------------------------------------------------------------
  // AI Moderation Center
  // ---------------------------------------------------------------------------
  @Get('ai-moderation')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER, RoleType.MODERATOR)
  @ApiOperation({ summary: 'List AI-generated draft questions for moderation' })
  async listAiModeration(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listAiModeration(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('ai-moderation/batch-approve')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.CONTENT_MANAGER)
  @ApiOperation({ summary: 'Batch approve AI-generated draft questions' })
  async batchApproveAiQuestions(
    @Body() dto: BatchApproveAiQuestionsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.batchApproveAiQuestions(dto, user.id, req.ip);
  }

  // ---------------------------------------------------------------------------
  // System Settings
  // ---------------------------------------------------------------------------
  @Get('settings')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN)
  @ApiOperation({ summary: 'Retrieve system operational settings' })
  getSettings() {
    return this.adminService.getSystemSettings();
  }

  @Patch('settings')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update system operational settings (Super Admin only)' })
  async updateSettings(
    @Body() dto: UpdateSystemSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminService.updateSystemSettings(dto, user.id, req.ip);
  }

  // Legacy Question Status
  @Patch('questions/:id/status')
  @Roles(RoleType.SUPER_ADMIN, RoleType.ADMIN, RoleType.MODERATOR)
  @ApiOperation({ summary: 'Update question moderation status' })
  async updateQuestionStatus(
    @Param('id') id: string,
    @Body('status') status: QuestionStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateQuestionStatus(id, status, user.id);
  }
}
