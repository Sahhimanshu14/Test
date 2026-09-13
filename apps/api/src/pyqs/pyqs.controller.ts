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
import { PyqsService } from './pyqs.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleType } from '@cdsprep/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  CreatePYQPaperDto,
  UpdatePYQPaperDto,
  MapPYQQuestionsDto,
  PYQFilterQueryDto,
  BulkImportPYQDto,
} from './dto/pyqs.dto';

@ApiTags('Previous Year Questions (PYQs)')
@Controller('pyqs')
export class PyqsController {
  constructor(private readonly pyqsService: PyqsService) {}

  @Public()
  @Get('papers')
  @ApiOperation({ summary: 'List organized UPSC CDS PYQ papers with multi-facet filters' })
  @SwaggerResponse({ status: 200, description: 'List of PYQ papers' })
  async listPapers(@Query() query: PYQFilterQueryDto) {
    return this.pyqsService.listPapers(query, false);
  }

  @Get('admin/papers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: List all PYQ papers including unreleased drafts' })
  @SwaggerResponse({ status: 200, description: 'Admin PYQ papers list' })
  async listAdminPapers(@Query() query: PYQFilterQueryDto) {
    return this.pyqsService.listPapers(query, true);
  }

  @Public()
  @Get('years')
  @ApiOperation({ summary: 'Get discovery catalog of distinct PYQ years with exam counts' })
  @SwaggerResponse({ status: 200, description: 'Years catalog returned' })
  async getYearsCatalog() {
    return this.pyqsService.getYearsCatalog();
  }

  @Public()
  @Get('subjects')
  @ApiOperation({ summary: 'Get discovery catalog of subjects with available PYQs' })
  @SwaggerResponse({ status: 200, description: 'Subjects catalog returned' })
  async getSubjectsCatalog() {
    return this.pyqsService.getSubjectsCatalog();
  }

  @Public()
  @Get('papers/:id')
  @ApiOperation({ summary: 'Get complete PYQ paper with questions and legal license attribution' })
  @SwaggerResponse({ status: 200, description: 'PYQ paper details with questions' })
  async getPaperDetails(@Param('id') id: string) {
    return this.pyqsService.getPaperDetails(id);
  }

  @Post('papers/:id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start Authoritative Test Attempt for this PYQ Paper in the test engine' })
  @SwaggerResponse({ status: 201, description: 'Examination session initiated in authoritative test engine' })
  async startPaperAttempt(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pyqsService.startPaperAttempt(id, user.id);
  }

  @Post('papers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Create new PYQ paper with mandatory legal attribution' })
  @SwaggerResponse({ status: 201, description: 'PYQ paper created' })
  async createPaper(@Body() dto: CreatePYQPaperDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pyqsService.createPaper(dto, user);
  }

  @Put('papers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Update PYQ paper metadata and license terms' })
  @SwaggerResponse({ status: 200, description: 'PYQ paper updated' })
  async updatePaper(
    @Param('id') id: string,
    @Body() dto: UpdatePYQPaperDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pyqsService.updatePaper(id, dto, user);
  }

  @Patch('papers/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Publish PYQ paper to candidate exam catalog' })
  @SwaggerResponse({ status: 200, description: 'PYQ paper published' })
  async publishPaper(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pyqsService.publishPaper(id, user);
  }

  @Post('papers/:id/map-questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Map questions to paper with duplicate mapping prevention' })
  @SwaggerResponse({ status: 200, description: 'Questions mapped and backing test synchronized' })
  async mapQuestions(
    @Param('id') id: string,
    @Body() dto: MapPYQQuestionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pyqsService.mapQuestions(id, dto, user);
  }

  @Post('bulk-import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Bulk import PYQ paper with questions and legal license' })
  @SwaggerResponse({ status: 201, description: 'Bulk PYQ imported successfully' })
  async bulkImportPYQ(@Body() dto: BulkImportPYQDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pyqsService.bulkImportPYQ(dto, user);
  }

  @Delete('papers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Delete PYQ paper' })
  @SwaggerResponse({ status: 200, description: 'PYQ paper deleted' })
  async deletePaper(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pyqsService.deletePaper(id, user);
  }
}
