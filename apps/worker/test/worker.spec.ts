import { describe, it, expect } from 'vitest';
import { WorkerHealthService } from '../src/health/worker-health.service';

describe('Worker Health Service', () => {
  it('returns ok status and reports active queues', () => {
    const service = new WorkerHealthService();
    const health = service.getHealth();

    expect(health.status).toBe('ok');
    expect(health.service).toBe('worker');
    expect(health.services?.worker?.status).toBe('ok');
    expect(health.services?.worker?.details?.activeQueues).toContain('test-scoring');
  });
});
