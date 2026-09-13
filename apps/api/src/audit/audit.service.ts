import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(page: number = 1, limit: number = 25, entityType?: string) {
    const skip = (page - 1) * limit;
    const where = {
      ...(entityType ? { entityType } : {}),
    };

    const [total, logs] = await Promise.all([
      this.prisma.client.auditLog.count({ where }),
      this.prisma.client.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, fullName: true },
          },
        },
      }),
    ]);

    return {
      items: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async logAction(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
  ) {
    return this.prisma.client.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        ipAddress,
      },
    });
  }

  async log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId?: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    return this.logAction(
      entry.userId || null,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.metadata,
      entry.ipAddress,
    );
  }
}
