import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { TaskQueueService } from 'src/queue/task-queue.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './entities/task.entity';
import { TaskExecutionLogRepository } from './repositories/task-execution-log.repository';
import { TaskRepository } from './repositories/task.repository';
import { TaskStatus } from './task-status.enum';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly taskExecutionLogRepository: TaskExecutionLogRepository,
    private readonly taskQueueService: TaskQueueService,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  /**
   * Create a pending task record and enqueue it for execution.
   */
  async schedule(dto: CreateTaskDto): Promise<Task> {
    const scheduledTime = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledTime.getTime())) {
      throw new BadRequestException('Invalid scheduledAt value');
    }
    if (scheduledTime.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }

    const maxAttempts = dto.maxAttempts ?? 5;

    let task: Task;
    try {
      task = await this.sequelize.transaction(async (transaction) =>
        this.taskRepository.create(
          {
            url: dto.url,
            payload: dto.payload,
            scheduledAt: scheduledTime,
            maxAttempts,
            status: TaskStatus.PENDING,
          },
          transaction,
        ),
      );
    } catch (error) {
      this.logger.error(
        'Failed to persist scheduled task',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to create task');
    }

    const delay = scheduledTime.getTime() - Date.now();
    try {
      await this.taskQueueService.addExecutionJob(task.id, delay, maxAttempts);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue task ${task.id}`,
        error instanceof Error ? error.stack : String(error),
      );

      await this.sequelize.transaction(async (transaction) => {
        try {
          await this.taskRepository.updateById(
            task.id,
            {
              status: TaskStatus.FAILED,
              lastError: 'Queue enqueue failed',
            },
            transaction,
          );
        } catch (updateError) {
          this.logger.error(
            `Failed to mark task ${task.id} as FAILED after enqueue error`,
            updateError instanceof Error ? updateError.stack : String(updateError),
          );
        }
      });

      throw new ServiceUnavailableException(
        'Task was created but could not be scheduled in queue',
      );
    }

    return task;
  }

  /**
   * List all tasks ordered by scheduled execution time.
   */
  async findAll() {
    try {
      return await this.taskRepository.findAll({
        order: [['scheduledAt', 'ASC']],
      });
    } catch (error) {
      this.handleUnexpectedError(error, 'findAll');
    }
  }

  /**
   * Get one task by id.
   */
  async findById(id: string) {
    let task: Task | null;
    try {
      task = await this.taskRepository.findById(id);
    } catch (error) {
      this.handleUnexpectedError(error, 'findById');
    }
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  /**
   * Cancel a non-finalized task and remove its queued job.
   */
  async cancel(id: string) {
    const task = await this.findById(id);

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) {
      throw new ConflictException(`Task ${id} is already finalized and cannot be canceled`);
    }

    if (task.status === TaskStatus.CANCELED) {
      return task;
    }

    if (task.status === TaskStatus.RUNNING) {
      throw new ConflictException(`Task ${id} is currently running and cannot be canceled`);
    }

    try {
      await this.sequelize.transaction(async (transaction) => {
        await this.taskRepository.updateById(
          id,
          {
            status: TaskStatus.CANCELED,
            canceledAt: new Date(),
          },
          transaction,
        );
      });
    } catch (error) {
      this.handleUnexpectedError(error, 'cancel:update');
    }

    await this.taskQueueService.removeJob(id);

    return this.findById(id);
  }

  /**
   * Get execution logs for a task.
   */
  async findLogs(id: string) {
    await this.findById(id);
    try {
      return await this.taskExecutionLogRepository.findByTaskId(id);
    } catch (error) {
      this.handleUnexpectedError(error, 'findLogs');
    }
  }

  private handleUnexpectedError(error: unknown, operation: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error(
      `Unexpected error in TaskService.${operation}`,
      error instanceof Error ? error.stack : String(error),
    );
    throw new InternalServerErrorException('Task operation failed');
  }
}
