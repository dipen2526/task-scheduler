import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { databaseConfig } from 'src/config/db.config';
import { TaskModule } from 'src/modules/task/task.module';

@Module({
  imports: [SequelizeModule.forRoot(databaseConfig), TaskModule],
})
export class AppModule {}
