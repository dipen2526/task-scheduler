import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { Job, Worker } from 'bullmq';
import { Transaction } from 'sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { redisConfig } from 'src/config/redis.config';
import { TaskExecutionLogRepository } from 'src/modules/task/repositories/task-execution-log.repository';
import { TaskRepository } from 'src/modules/task/repositories/task.repository';
import { TaskStatus } from 'src/modules/task/task-status.enum';

interface ExecuteTaskJob {
  taskId: string;
}

@Injectable()
export class WorkerProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerProcessor.name);
  private worker: Worker<ExecuteTaskJob>;

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly taskExecutionLogRepository: TaskExecutionLogRepository,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  /**
   * Initialize BullMQ worker and register runtime event handlers.
   */
  onModuleInit() {
    this.worker = new Worker<ExecuteTaskJob>(
      'task-queue',
      async (job) => this.process(job),
      { connection: redisConfig, concurrency: 5 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Job ${job?.id ?? 'unknown'} failed: ${error.message}`,
        error.stack,
      );
    });
    this.worker.on('error', (error) => {
      this.logger.error('Worker runtime error', error.stack);
    });
    this.logger.log('Worker initialized');
  }

  /**
   * Execute one queued task and persist state transitions.
   */
  private async process(job: Job<ExecuteTaskJob>) {
    let task:
      | {
          id: string;
          url: string;
          payload: any;
          attempt: number;
          maxAttempts: number;
        }
      | null = null;
    try {
      task = await this.sequelize.transaction(async (transaction) => {
        const currentTask = await this.taskRepository.findById(
          job.data.taskId,
          transaction,
          true,
        );

        if (!currentTask) {
          this.logger.warn(`Skipping job for missing task ${job.data.taskId}`);
          return null;
        }

        if (currentTask.status === TaskStatus.CANCELED) {
          this.logger.log(`Skipping canceled task ${currentTask.id}`);
          return null;
        }

        const attempt = currentTask.attempts + 1;
        await this.taskRepository.updateById(
          currentTask.id,
          {
            status: TaskStatus.RUNNING,
            attempts: attempt,
          },
          transaction,
        );

        return {
          id: currentTask.id,
          url: currentTask.url,
          payload: currentTask.payload,
          attempt,
          maxAttempts: currentTask.maxAttempts,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to prepare task ${job.data.taskId} for execution`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }

    if (!task) {
      return;
    }

    try {
      const response = await axios.post(task.url, task.payload, { timeout: 15000 });

      await this.sequelize.transaction(async (transaction) => {
        await this.taskRepository.updateById(
          task.id,
          {
            status: TaskStatus.COMPLETED,
            executedAt: new Date(),
            lastError: null,
            nextRetryAt: null,
          },
          transaction,
        );

        await this.taskExecutionLogRepository.create(
          {
            taskId: task.id,
            attempt: task.attempt,
            status: TaskStatus.COMPLETED,
            httpStatus: response.status,
            responseBody: response.data,
          },
          transaction,
        );
      });
    } catch (error) {
      await this.handleFailure(task.id, task.attempt, task.maxAttempts, error, job.id);
      throw error;
    }
  }

  /**
   * Persist retry/failure state and attempt log after an execution error.
   */
  private async handleFailure(
    taskId: string,
    attempt: number,
    maxAttempts: number,
    error: unknown,
    jobId?: string,
  ) {
    const errorMessage =
      axios.isAxiosError(error)
        ? `${error.message}${error.response ? ` (HTTP ${error.response.status})` : ''}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';
    const httpStatus =
      axios.isAxiosError(error) && error.response ? error.response.status : null;
    const responseBody =
      axios.isAxiosError(error) && error.response ? error.response.data : null;
    const shouldRetry = attempt < maxAttempts;
    const retryDelayMs = shouldRetry ? 5000 * 2 ** (attempt - 1) : null;

    try {
      await this.sequelize.transaction(async (transaction: Transaction) => {
        await this.taskRepository.updateById(
          taskId,
          {
            status: shouldRetry ? TaskStatus.PENDING : TaskStatus.FAILED,
            lastError: errorMessage,
            nextRetryAt: retryDelayMs ? new Date(Date.now() + retryDelayMs) : null,
          },
          transaction,
        );

        await this.taskExecutionLogRepository.create(
          {
            taskId,
            attempt,
            status: shouldRetry ? TaskStatus.PENDING : TaskStatus.FAILED,
            httpStatus,
            responseBody,
            error: errorMessage,
          },
          transaction,
        );
      });
    } catch (persistError) {
      this.logger.error(
        `Failed to persist failure state for task ${taskId} (job ${jobId ?? 'n/a'})`,
        persistError instanceof Error ? persistError.stack : String(persistError),
      );
      throw persistError;
    }
  }

  /**
   * Gracefully close the BullMQ worker on shutdown.
   */
  async onModuleDestroy() {
    if (this.worker) {
      try {
        await this.worker.close();
      } catch (error) {
        this.logger.error(
          'Failed to close worker cleanly',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
