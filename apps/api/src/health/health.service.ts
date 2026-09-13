import { Injectable, Logger, Optional } from '@nestjs/common';
import { HealthCheckResponse, HealthStatus, ServiceHealth } from '@cdsprep/types';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { getSanitizedConfigReport, validateServerEnv, IntegrationStatus } from '@cdsprep/config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly cache?: CacheService,
  ) {}

  async checkDatabase(): Promise<ServiceHealth> {
    if (!this.prisma?.client?.$queryRawUnsafe) {
      return { status: 'ok', latencyMs: 1 };
    }

    const start = performance.now();
    try {
      await this.prisma.client.$queryRawUnsafe('SELECT 1');
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      return { status: 'ok', latencyMs };
    } catch (err: any) {
      this.logger.warn(`Database health probe failed: ${err.message}`);
      return { status: 'down', latencyMs: -1, message: err.message };
    }
  }

  async checkRedis(): Promise<ServiceHealth> {
    if (!this.cache?.ping) {
      return { status: 'ok', latencyMs: 1 };
    }

    try {
      const res = await this.cache.ping();
      return {
        status: res.ok ? 'ok' : 'degraded',
        latencyMs: res.latencyMs,
      };
    } catch (err: any) {
      this.logger.warn(`Redis health probe failed: ${err.message}`);
      return { status: 'degraded', latencyMs: -1, message: err.message };
    }
  }

  async getHealth(): Promise<HealthCheckResponse> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const [dbHealth, redisHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    let overallStatus: HealthStatus = 'ok';
    if (dbHealth.status === 'down') {
      overallStatus = 'down';
    } else if (redisHealth.status === 'degraded' || redisHealth.status === 'down') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      service: 'api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
    };
  }

  getLiveness(): { status: HealthStatus } {
    return { status: 'ok' };
  }

  async getReadiness(): Promise<{
    status: HealthStatus;
    ready: boolean;
    services: { database: ServiceHealth; redis: ServiceHealth };
  }> {
    const [dbHealth, redisHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const isReady = dbHealth.status === 'ok';

    return {
      status: isReady ? 'ok' : 'down',
      ready: isReady,
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
    };
  }

  getIntegrationsReport(): IntegrationStatus[] {
    try {
      const serverEnv = validateServerEnv();
      return getSanitizedConfigReport(serverEnv);
    } catch {
      return [];
    }
  }
}
