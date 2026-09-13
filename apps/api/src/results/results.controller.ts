import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiQuery } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Test Results & Scorecards')
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get('my-results')
  @ApiOperation({ summary: 'List historical exam results with pagination for current student' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @SwaggerResponse({ status: 200, description: 'List of scorecards returned' })
  async listUserResults(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.resultsService.listUserResults(user.id, pageNum, limitNum);
  }

  @Get('attempt/:attemptId')
  @ApiOperation({ summary: 'Get comprehensive scorecard and question-by-question analysis' })
  @SwaggerResponse({ status: 200, description: 'Complete scorecard returned' })
  async getResultByAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
  ) {
    return this.resultsService.getResultByAttempt(user.id, attemptId);
  }
}
