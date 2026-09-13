import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CadetGamificationProfileDto } from './dto/gamification.dto';

@ApiTags('Gamification & Cadet Progression')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current cadet XP, rank tier, earned badges, and daily goals' })
  @SwaggerResponse({ status: 200, type: CadetGamificationProfileDto })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<CadetGamificationProfileDto> {
    return this.gamificationService.getCadetProfile(user.id);
  }

  @Public()
  @Get('badges')
  @ApiOperation({ summary: 'List complete platform achievement badges catalog' })
  @SwaggerResponse({ status: 200, description: 'List of all achievement badges' })
  getBadges() {
    return this.gamificationService.getBadgeCatalog();
  }
}
