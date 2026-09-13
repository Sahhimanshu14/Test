export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface ServiceHealth {
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResponse {
  status: HealthStatus;
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  services?: {
    database?: ServiceHealth;
    redis?: ServiceHealth;
    worker?: ServiceHealth;
    [key: string]: ServiceHealth | undefined;
  };
}
