import { Injectable } from '@nestjs/common';
import { HealthCheckResponse } from '@cdsprep/types';

@Injectable()
export class WorkerHealthService {
  private readonly startTime = Date.now();

  getHealth(): HealthCheckResponse {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const memory = process.memoryUsage();

    return {
      status: 'ok',
      service: 'worker',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      environment: process.env.NODE_ENV || 'development',
      services: {
        worker: {
          status: 'ok',
          details: {
            heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
            activeQueues: ['test-scoring', 'ai-explanation', 'analytics-recalc'],
          },
        },
      },
    };
  }
}
