import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { RoleType } from '@cdsprep/types';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionQueryDto,
  UpdateQuestionStatusDto,
  BulkImportDto,
} from './dto/questions.dto';

@ApiTags('Questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Filter published practice questions (Candidate Practice Mode)' })
  @SwaggerResponse({ status: 200, description: 'Paginated questions list' })
  async findAll(@Query() query: QuestionQueryDto) {
    return this.questionsService.findAll({ ...query, isAdmin: false });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_EDITOR, RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Staff Question Moderation List (All statuses, options & solutions)' })
  @SwaggerResponse({ status: 200, description: 'Admin question list' })
  async findAdminAll(@Query() query: QuestionQueryDto) {
    return this.questionsService.findAll({ ...query, isAdmin: true });
  }

  @Public()
  @Get(':id/solution')
  @ApiOperation({ summary: 'Get question with full solution and explanation (Practice mode)' })
  @SwaggerResponse({ status: 200, description: 'Question with explanation and correct answer' })
  async findOneWithSolution(@Param('id') id: string) {
    return this.questionsService.findOneWithSolution(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get single question details' })
  @SwaggerResponse({ status: 200, description: 'Question details' })
  async findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_EDITOR, RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new question with quality controls and audit log' })
  @SwaggerResponse({ status: 201, description: 'Question created successfully' })
  async create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_EDITOR, RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update question (Production questions require CONTENT_MANAGER)' })
  @SwaggerResponse({ status: 200, description: 'Question updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_EDITOR, RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transition question status (Publish/Archive requires CONTENT_MANAGER)' })
  @SwaggerResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionsService.updateStatus(id, dto.status, user, dto.reason);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive question (Authorized officers only)' })
  @SwaggerResponse({ status: 200, description: 'Question archived' })
  async archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.archive(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete question' })
  @SwaggerResponse({ status: 200, description: 'Question deleted' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.remove(id, user);
  }

  @Post('bulk-import/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_EDITOR, RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dry-run validation for bulk CSV / JSON import' })
  @SwaggerResponse({ status: 200, description: 'Validation metrics and diagnostics' })
  async validateBulkImport(@Body() dto: BulkImportDto) {
    return this.questionsService.validateBulkImport(dto);
  }

  @Post(['bulk-import', 'import'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Commit bulk import transaction (Content Managers only)' })
  @SwaggerResponse({ status: 201, description: 'Bulk questions imported' })
  async commitBulkImport(@Body() dto: BulkImportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.commitBulkImport(dto, user);
  }
}
