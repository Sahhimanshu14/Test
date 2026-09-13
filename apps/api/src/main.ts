import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Apply shared security headers, parsers, CORS, prefix, and Swagger documentation
  configureApp(app);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 CDSPrep REST API server listening on: http://localhost:${port}/api/v1`);
  logger.log(`📚 OpenAPI / Swagger documentation active at: http://localhost:${port}/api/docs`);
}

bootstrap();

