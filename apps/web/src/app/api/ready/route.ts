import { NextResponse } from 'next/server';

export async function GET() {
  const isHealthy = true;

  if (!isHealthy) {
    return NextResponse.json(
      {
        status: 'down',
        ready: false,
        service: 'web',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      status: 'ok',
      ready: true,
      service: 'web',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
    },
    { status: 200 },
  );
}
