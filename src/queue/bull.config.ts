import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.config';

export const taskQueue = new Queue('task-queue', { connection: redisConfig });
