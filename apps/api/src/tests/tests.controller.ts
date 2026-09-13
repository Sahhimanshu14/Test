import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { TestsService } from './tests.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleType, TestType } from '@cdsprep/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createTestSchema,
  createTestSectionSchema,
  assignTestQuestionsSchema,
  CreateTestInput,
  CreateTestSectionInput,
  AssignTestQuestionsInput,
} from '@cdsprep/validation';

@ApiTags('Mock Tests')
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List mock tests catalog with optional type filtering' })
  @SwaggerResponse({ status: 200, description: 'Tests list returned' })
  async listTests(
    @Query('isFullMock') isFullMock?: string,
    @Query('testType') testType?: TestType,
  ) {
    const isFull = isFullMock !== undefined ? isFullMock === 'true' : undefined;
    return this.testsService.listTests(isFull, testType);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get mock test instruction and structure preview' })
  @SwaggerResponse({ status: 200, description: 'Test preview details' })
  async getTestPreview(@Param('slug') slug: string) {
    return this.testsService.getTestPreview(slug);
  }

  @Roles(RoleType.ADMIN, RoleType.CONTENT_MANAGER)
  @Post()
  @UsePipes(new ZodValidationPipe(createTestSchema))
  @ApiOperation({ summary: 'Create a new database-driven test' })
  async createTest(@Body() dto: CreateTestInput) {
    return this.testsService.createTest(dto);
  }

  @Roles(RoleType.ADMIN, RoleType.CONTENT_MANAGER)
  @Post(':id/sections')
  @UsePipes(new ZodValidationPipe(createTestSectionSchema))
  @ApiOperation({ summary: 'Add a section to test' })
  async createSection(
    @Param('id') testId: string,
    @Body() dto: CreateTestSectionInput,
  ) {
    return this.testsService.createSection(testId, dto);
  }

  @Roles(RoleType.ADMIN, RoleType.CONTENT_MANAGER)
  @Post('sections/:id/questions')
  @UsePipes(new ZodValidationPipe(assignTestQuestionsSchema))
  @ApiOperation({ summary: 'Assign questions to test section' })
  async assignQuestions(
    @Param('id') sectionId: string,
    @Body() dto: AssignTestQuestionsInput,
  ) {
    return this.testsService.assignQuestions(sectionId, dto);
  }
}
