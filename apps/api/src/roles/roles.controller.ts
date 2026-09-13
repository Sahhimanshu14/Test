import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleType } from '@cdsprep/types';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Roles & Permissions')
@Controller('roles')
@UseGuards(RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles(RoleType.SUPER_ADMIN, RoleType.CONTENT_MANAGER)
  @ApiOperation({ summary: 'List all system roles and their permissions' })
  @SwaggerResponse({ status: 200, description: 'Roles listed' })
  async getRoles() {
    return this.rolesService.listRoles();
  }

  @Get('permissions')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all granular action permissions' })
  @SwaggerResponse({ status: 200, description: 'Permissions listed' })
  async getPermissions() {
    return this.rolesService.listPermissions();
  }
}
