import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FilesService } from './files.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('File & Asset Storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presign')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Register upload and obtain secure storage key' })
  @SwaggerResponse({ status: 201, description: 'Storage key and upload parameters generated' })
  async registerUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body('originalName') originalName: string,
    @Body('mimeType') mimeType: string,
    @Body('sizeBytes') sizeBytes: number,
  ) {
    return this.filesService.registerUpload(user.id, originalName, mimeType, sizeBytes);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file asset metadata by ID with IDOR protection' })
  @SwaggerResponse({ status: 200, description: 'File metadata returned' })
  async getMetadata(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.filesService.getAssetMetadata(user, id);
  }
}
