import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubjectsService, CreateSubjectDto, CreateChapterDto, CreateTopicDto } from './subjects.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleType } from '@cdsprep/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all core CDS syllabus subjects with complete chapter & topic tree' })
  @SwaggerResponse({ status: 200, description: 'List of subjects returned' })
  async findAll() {
    return this.subjectsService.findAll();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get subject detail with nested chapters and topics' })
  @SwaggerResponse({ status: 200, description: 'Subject tree returned' })
  async findBySlug(@Param('slug') slug: string) {
    return this.subjectsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dynamically register a new syllabus subject' })
  @SwaggerResponse({ status: 201, description: 'Subject registered' })
  async createSubject(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.createSubject(dto);
  }

  @Post('chapters')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dynamically add a chapter under a subject' })
  @SwaggerResponse({ status: 201, description: 'Chapter created' })
  async createChapter(@Body() dto: CreateChapterDto) {
    return this.subjectsService.createChapter(dto);
  }

  @Post('topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.CONTENT_MANAGER, RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dynamically add a topic under a chapter' })
  @SwaggerResponse({ status: 201, description: 'Topic created' })
  async createTopic(@Body() dto: CreateTopicDto) {
    return this.subjectsService.createTopic(dto);
  }
}
