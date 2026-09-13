import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';
import { WorkerHealthService } from './health/worker-health.service';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const healthService = app.get(WorkerHealthService);

  logger.log('CDSPrep BullMQ Worker initialized.');
  logger.log(`Initial Health State: ${JSON.stringify(healthService.getHealth())}`);

  // Handle graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal}. Gracefully closing worker context...`);
      await app.close();
      process.exit(0);
    });
  }
}

bootstrap();
