import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions, Transaction } from 'sequelize';
import { Task } from 'src/modules/task/entities/task.entity';

@Injectable()
export class TaskRepository {
  private readonly logger = new Logger(TaskRepository.name);

  constructor(@InjectModel(Task) private readonly model: typeof Task) {}

  /**
   * Create a task row.
   */
  async create(data: Partial<Task>, transaction?: Transaction) {
    try {
      return await this.model.create(data as any, { transaction });
    } catch (error) {
      this.logger.error(
        'Failed to create task record',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to create task record');
    }
  }

  /**
   * Retrieve task rows using optional Sequelize query options.
   */
  async findAll(options?: FindOptions<Task>) {
    try {
      return await this.model.findAll(options);
    } catch (error) {
      this.logger.error(
        'Failed to fetch task records',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to fetch task records');
    }
  }

  /**
   * Find a task by primary key.
   */
  async findById(id: string, transaction?: Transaction, lock = false) {
    try {
      return await this.model.findByPk(id, {
        transaction,
        lock: lock ? transaction?.LOCK.UPDATE : undefined,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch task ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to fetch task');
    }
  }

  /**
   * Update a task row and return the latest persisted state.
   */
  async updateById(id: string, data: Partial<Task>, transaction?: Transaction) {
    try {
      await this.model.update(data, { where: { id }, transaction });
      return await this.findById(id, transaction);
    } catch (error) {
      this.logger.error(
        `Failed to update task ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to update task');
    }
  }
}
