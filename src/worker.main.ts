import { NestFactory } from '@nestjs/core';
import { WorkerModule } from 'src/modules/worker/worker.module';
import { WorkerProcessor } from 'src/modules/worker/worker.processor';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.get(WorkerProcessor);
}

void bootstrap();
