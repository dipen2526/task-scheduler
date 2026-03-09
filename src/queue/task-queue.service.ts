import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { redisConfig } from 'src/config/redis.config';

@Injectable()
export class TaskQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(TaskQueueService.name);
  private readonly queue = new Queue('task-queue', { connection: redisConfig });

  /**
   * Enqueue a delayed task execution job.
   * @param taskId Unique task identifier used as BullMQ `jobId`.
   * @param delay Delay in milliseconds before the job can be processed.
   * @param maxAttempts Max retry attempts configured for BullMQ.
   * @throws ServiceUnavailableException when the queue operation fails.
   */
  async addExecutionJob(taskId: string, delay: number, maxAttempts: number) {
    if (!taskId?.trim()) {
      throw new ServiceUnavailableException('Cannot enqueue task without a taskId');
    }
    if (!Number.isFinite(maxAttempts) || maxAttempts < 1) {
      throw new ServiceUnavailableException('Cannot enqueue task with invalid maxAttempts');
    }

    const options: JobsOptions = {
      jobId: taskId,
      delay: Math.max(delay, 0),
      attempts: maxAttempts,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    };

    try {
      await this.queue.add('execute-task', { taskId }, options);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue execution job for task ${taskId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        `Failed to enqueue execution job for task ${taskId}`,
      );
    }
  }

  /**
   * Remove a scheduled job from the queue.
   * @param taskId Task identifier / BullMQ jobId.
   * @returns `true` if a job existed and was removed, otherwise `false`.
   * @throws ServiceUnavailableException when queue lookup/removal fails.
   */
  async removeJob(taskId: string) {
    if (!taskId?.trim()) {
      return false;
    }

    try {
      const job = await this.queue.getJob(taskId);
      if (!job) {
        return false;
      }

      await job.remove();
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to remove execution job for task ${taskId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        `Failed to remove execution job for task ${taskId}`,
      );
    }
  }

  /**
   * Close the underlying BullMQ queue on module shutdown.
   */
  async onModuleDestroy() {
    try {
      await this.queue.close();
    } catch (error) {
      this.logger.error(
        'Failed to close BullMQ queue cleanly',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
