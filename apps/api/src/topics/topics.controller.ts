import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { TopicsService } from './topics.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Public()
  @Get('by-chapter/:chapterId')
  @ApiOperation({ summary: 'Get all topics belonging to a chapter' })
  @SwaggerResponse({ status: 200, description: 'Topics returned' })
  async findByChapter(@Param('chapterId') chapterId: string) {
    return this.topicsService.findByChapter(chapterId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get topic details by ID' })
  @SwaggerResponse({ status: 200, description: 'Topic details returned' })
  async findOne(@Param('id') id: string) {
    return this.topicsService.findOne(id);
  }
}
