import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { prisma, PrismaClient } from '@cdsprep/database';
import { createDevPrismaProxy } from './dev-store';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;
  public readonly client: PrismaClient;

  constructor() {
    this.client = createDevPrismaProxy(prisma, () => this.isConnected);
  }

  async onModuleInit() {
    try {
      await prisma.$connect();
      this.isConnected = true;
      this.logger.log('Prisma client successfully connected to PostgreSQL.');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(
        `PostgreSQL database is currently unreachable (${err.message}). API started with in-memory dev database fallback. All auth, mock test, and CDS question flows are active.`,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore disconnect error on shutdown
    }
  }
}

