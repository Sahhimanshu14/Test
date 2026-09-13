import { describe, it, expect } from 'vitest';
import { HealthService } from '../src/health/health.service';

describe('API HealthService', () => {
  it('returns ok status and metadata when healthy', async () => {
    const service = new HealthService();
    const health = await service.getHealth();

    expect(health.status).toBe('ok');
    expect(health.service).toBe('api');
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(health.services?.database?.status).toBe('ok');
  });

  it('returns liveness and readiness statuses', async () => {
    const service = new HealthService();
    expect(service.getLiveness().status).toBe('ok');

    const readiness = await service.getReadiness();
    expect(readiness.ready).toBe(true);
    expect(readiness.status).toBe('ok');
  });

  it('marks service as down when database probe fails', async () => {
    const failingPrisma: any = {
      client: {
        $queryRawUnsafe: async () => {
          throw new Error('Connection refused at 5432');
        },
      },
    };

    const service = new HealthService(failingPrisma);
    const readiness = await service.getReadiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.status).toBe('down');
    expect(readiness.services.database.status).toBe('down');
  });
});
