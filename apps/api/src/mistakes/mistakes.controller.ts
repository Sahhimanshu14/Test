import { Controller, Get, Patch, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { MistakesService } from './mistakes.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MistakeStatus } from '@cdsprep/types';

@ApiTags('Mistake Notebook')
@Controller('mistakes')
export class MistakesController {
  constructor(private readonly mistakesService: MistakesService) {}

  @Get()
  @ApiOperation({ summary: 'List mistake notebook entries for student with user answer and explanation' })
  @SwaggerResponse({ status: 200, description: 'List of mistake records returned' })
  async listMistakes(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: MistakeStatus,
  ) {
    return this.mistakesService.listMistakes(user.id, status);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update mistake status or toggle careless label' })
  @SwaggerResponse({ status: 200, description: 'Mistake updated' })
  async updateMistakeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('status') status: MistakeStatus,
    @Body('isCareless') isCareless?: boolean,
  ) {
    return this.mistakesService.updateMistakeStatus(user.id, id, status, isCareless);
  }

  @Post(':id/master')
  @ApiOperation({ summary: 'Mark mistake as mastered' })
  @SwaggerResponse({ status: 200, description: 'Mistake marked as mastered' })
  async markMastered(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.mistakesService.markMastered(user.id, id);
  }
}
