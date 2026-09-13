import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckResponse, HealthStatus } from '@cdsprep/types';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health & Probes')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get(['health', 'api/health', 'api/v1/health'])
  @ApiOperation({ summary: 'Comprehensive system health check with services status' })
  @SwaggerResponse({ status: 200, description: 'Health status returned' })
  async getHealth(): Promise<HealthCheckResponse> {
    return this.healthService.getHealth();
  }

  @Public()
  @Get(['health/liveness', 'api/liveness', 'api/v1/liveness'])
  @ApiOperation({ summary: 'Kubernetes/Docker liveness probe' })
  @SwaggerResponse({ status: 200, description: 'Liveness status returned' })
  getLiveness(): { status: HealthStatus } {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get(['ready', 'api/ready', 'api/v1/ready', 'health/readiness'])
  @ApiOperation({ summary: 'Kubernetes/Docker readiness probe with dependency checks' })
  @SwaggerResponse({ status: 200, description: 'Readiness status returned' })
  @SwaggerResponse({ status: 503, description: 'Service unavailable - dependency check failed' })
  async getReadiness(@Res({ passthrough: true }) res: Response): Promise<{
    status: HealthStatus;
    ready: boolean;
    services: Record<string, unknown>;
  }> {
    const readiness = await this.healthService.getReadiness();
    if (!readiness.ready) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return readiness;
  }

  @Public()
  @Get(['health/integrations', 'api/health/integrations', 'api/v1/health/integrations'])
  @ApiOperation({ summary: 'Redacted status report of all external services and integrations' })
  @SwaggerResponse({ status: 200, description: 'Sanitized integration status list returned' })
  getIntegrations() {
    return this.healthService.getIntegrationsReport();
  }
}
