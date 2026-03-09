import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { databaseConfig } from 'src/config/db.config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { TaskExecutionLog } from 'src/modules/task/entities/task-execution-log.entity';
import { Task } from 'src/modules/task/entities/task.entity';
import { TaskModule } from 'src/modules/task/task.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    SequelizeModule.forRoot({
      ...databaseConfig,
      models: [Task, TaskExecutionLog],
    }),
    AuthModule,
    TaskModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
