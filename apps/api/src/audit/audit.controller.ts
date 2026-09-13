import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleType } from '@cdsprep/types';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Audit Logs')
@Controller('audit')
@UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Query system security and administrative audit logs' })
  @SwaggerResponse({ status: 200, description: 'Audit logs returned' })
  async listLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.auditService.listAuditLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 25,
      entityType,
    );
  }
}
