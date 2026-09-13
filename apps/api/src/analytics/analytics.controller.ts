import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Performance Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get student overview analytics and readiness score' })
  @SwaggerResponse({ status: 200, description: 'Dashboard analytics returned' })
  async getDashboardSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getStudentDashboardSummary(user.id);
  }

  @Get('subjects')
  @ApiOperation({ summary: 'Get subject-level breakdown analytics (English, GK, Maths)' })
  @SwaggerResponse({ status: 200, description: 'Subject analytics returned' })
  async getSubjectAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getSubjectAnalytics(user.id);
  }

  @Get('topics')
  @ApiOperation({ summary: 'Get topic-level accuracy and weakness identification' })
  @SwaggerResponse({ status: 200, description: 'Topic analytics returned' })
  async getTopicAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getTopicAnalytics(user.id);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get chronological performance and score trends' })
  @SwaggerResponse({ status: 200, description: 'Performance trends returned' })
  async getPerformanceTrends(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getPerformanceTrends(user.id);
  }

  @Get('time')
  @ApiOperation({ summary: 'Get time analysis, average pacing, slow/fast topics, and distribution' })
  @SwaggerResponse({ status: 200, description: 'Time analysis returned' })
  async getTimeAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getTimeAnalytics(user.id);
  }
}
