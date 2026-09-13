import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';

let cachedServer: express.Express | null = null;

/**
 * Serverless bootstrap handler for Vercel Functions.
 * Caches the initialized Express adapter and NestJS application context
 * across function invocations to eliminate cold start overhead.
 */
async function bootstrapServerless(): Promise<express.Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  configureApp(app);
  await app.init();

  cachedServer = expressApp;
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServerless();
  return server(req, res);
}
