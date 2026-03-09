import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { TaskExecutionLog } from 'src/modules/task/entities/task-execution-log.entity';

@Injectable()
export class TaskExecutionLogRepository {
  private readonly logger = new Logger(TaskExecutionLogRepository.name);

  constructor(
    @InjectModel(TaskExecutionLog)
    private readonly model: typeof TaskExecutionLog,
  ) {}

  /**
   * Create an execution log row for a task attempt.
   */
  async create(data: Partial<TaskExecutionLog>, transaction?: Transaction) {
    try {
      return await this.model.create(data as any, { transaction });
    } catch (error) {
      this.logger.error(
        'Failed to create task execution log',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to create task execution log');
    }
  }

  /**
   * Return execution logs for a task, newest first.
   */
  async findByTaskId(taskId: string) {
    try {
      return await this.model.findAll({
        where: { taskId },
        order: [['createdAt', 'DESC']],
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch logs for task ${taskId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to fetch task execution logs');
    }
  }
}
