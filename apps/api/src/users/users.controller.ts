import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { UsersService, UpdateProfileDto } from './users.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AcademyTarget } from '@cdsprep/types';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user full profile' })
  @SwaggerResponse({ status: 200, description: 'Profile returned' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update student profile information' })
  @SwaggerResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('target-academy')
  @ApiOperation({ summary: 'Update student target academy (IMA, INA, AFA, OTA)' })
  @SwaggerResponse({ status: 200, description: 'Target academy updated' })
  async updateTargetAcademy(
    @CurrentUser() user: AuthenticatedUser,
    @Body('targetAcademy') targetAcademy: AcademyTarget,
  ) {
    return this.usersService.updateTargetAcademy(user.id, targetAcademy);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update student exam, notification and privacy preferences' })
  @SwaggerResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() preferences: Record<string, any>,
  ) {
    return this.usersService.updatePreferences(user.id, preferences);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID with strict IDOR protection' })
  @SwaggerResponse({ status: 200, description: 'User profile returned' })
  async getUserById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') targetUserId: string,
  ) {
    return this.usersService.getUserById(user, targetUserId);
  }
}
