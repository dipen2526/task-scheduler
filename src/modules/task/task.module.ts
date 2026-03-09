import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from 'src/modules/auth/auth.module';
import { TaskQueueService } from 'src/queue/task-queue.service';
import { TaskExecutionLog } from './entities/task-execution-log.entity';
import { Task } from './entities/task.entity';
import { TaskExecutionLogRepository } from './repositories/task-execution-log.repository';
import { TaskRepository } from './repositories/task.repository';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';

@Module({
  imports: [SequelizeModule.forFeature([Task, TaskExecutionLog]), AuthModule],
  controllers: [TaskController],
  providers: [TaskService, TaskRepository, TaskExecutionLogRepository, TaskQueueService],
  exports: [TaskService, TaskRepository, TaskExecutionLogRepository, TaskQueueService],
})
export class TaskModule {}
