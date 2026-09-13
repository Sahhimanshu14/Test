import { NextResponse } from 'next/server';
import { HealthCheckResponse } from '@cdsprep/types';

export async function GET() {
  const payload: HealthCheckResponse = {
    status: 'ok',
    service: 'web',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  };

  return NextResponse.json(payload, { status: 200 });
}
