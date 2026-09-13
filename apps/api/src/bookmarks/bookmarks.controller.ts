import { Controller, Get, Post, Delete, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Bookmarks')
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: 'List saved bookmarks for student with optional subject and keyword filters' })
  @SwaggerResponse({ status: 200, description: 'List of bookmarks returned' })
  async listBookmarks(
    @CurrentUser() user: AuthenticatedUser,
    @Query('subjectId') subjectId?: string,
    @Query('search') search?: string,
  ) {
    return this.bookmarksService.listBookmarks(user.id, subjectId, search);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Toggle question bookmark status' })
  @SwaggerResponse({ status: 200, description: 'Bookmark toggled' })
  async toggleBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Body('questionId') questionId: string,
    @Body('notes') notes?: string,
  ) {
    return this.bookmarksService.toggleBookmark(user.id, questionId, notes);
  }

  @Delete(':questionId')
  @ApiOperation({ summary: 'Remove question from bookmarks' })
  @SwaggerResponse({ status: 200, description: 'Bookmark removed' })
  async removeBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionId') questionId: string,
  ) {
    return this.bookmarksService.removeBookmark(user.id, questionId);
  }
}
