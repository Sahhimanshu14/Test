import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    return this.prisma.client.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async listPermissions() {
    return this.prisma.client.permission.findMany({
      orderBy: { action: 'asc' },
    });
  }
}
