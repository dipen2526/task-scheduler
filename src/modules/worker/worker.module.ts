import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { databaseConfig } from 'src/config/db.config';
import { TaskExecutionLog } from 'src/modules/task/entities/task-execution-log.entity';
import { Task } from 'src/modules/task/entities/task.entity';
import { TaskModule } from 'src/modules/task/task.module';
import { WorkerProcessor } from './worker.processor';

@Module({
  imports: [
    SequelizeModule.forRoot({
      ...databaseConfig,
      models: [Task, TaskExecutionLog],
    }),
    TaskModule,
  ],
  providers: [WorkerProcessor],
})
export class WorkerModule {}
