import { describe, it, expect } from 'vitest';
import { GET as getHealth } from '../src/app/api/health/route';
import { GET as getReady } from '../src/app/api/ready/route';

describe('Web Health & Readiness Endpoints', () => {
  it('returns status ok with service name web from health check', async () => {
    const response = await getHealth();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('web');
    expect(data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(data.timestamp).toBeDefined();
  });

  it('returns ready true with status ok from readiness check', async () => {
    const response = await getReady();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.ready).toBe(true);
    expect(data.service).toBe('web');
  });
});
