import { Controller, Get, Patch, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AcademyTarget } from '@cdsprep/types';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get leaderboard rankings with multi-period and academy filtering' })
  @SwaggerResponse({ status: 200, description: 'Leaderboard rankings returned' })
  async getRankings(
    @Query('period') period?: string,
    @Query('academy') academy?: AcademyTarget,
  ) {
    return this.leaderboardService.getRankings(period, academy);
  }

  @Patch('privacy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle anonymous leaderboard privacy setting for current cadet' })
  @SwaggerResponse({ status: 200, description: 'Privacy setting updated' })
  async updatePrivacy(
    @CurrentUser() user: AuthenticatedUser,
    @Body('isAnonymous') isAnonymous: boolean,
  ) {
    return this.leaderboardService.updatePrivacy(user.id, isAnonymous);
  }
}
