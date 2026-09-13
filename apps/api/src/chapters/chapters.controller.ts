import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Chapters')
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Public()
  @Get('by-subject/:subjectSlug')
  @ApiOperation({ summary: 'Get all chapters belonging to a subject' })
  @SwaggerResponse({ status: 200, description: 'Chapters returned' })
  async findBySubject(@Param('subjectSlug') subjectSlug: string) {
    return this.chaptersService.findBySubject(subjectSlug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get chapter details by ID' })
  @SwaggerResponse({ status: 200, description: 'Chapter details returned' })
  async findOne(@Param('id') id: string) {
    return this.chaptersService.findOne(id);
  }
}
