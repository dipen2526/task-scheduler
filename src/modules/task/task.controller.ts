import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskService } from './task.service';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  private readonly logger = new Logger(TaskController.name);

  constructor(private readonly service: TaskService) {}

  /**
   * Schedule a new task for future execution.
   */
  @Post()
  async create(@Body() dto: CreateTaskDto) {
    try {
      return await this.service.schedule(dto);
    } catch (error) {
      this.handleControllerError(error, 'create');
    }
  }

  /**
   * List all tasks sorted by schedule time.
   */
  @Get()
  async findAll() {
    try {
      return await this.service.findAll();
    } catch (error) {
      this.handleControllerError(error, 'findAll');
    }
  }

  /**
   * Fetch task details by id.
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    try {
      return await this.service.findById(id);
    } catch (error) {
      this.handleControllerError(error, 'findById');
    }
  }

  /**
   * Fetch execution logs for a task.
   */
  @Get(':id/logs')
  async findLogs(@Param('id') id: string) {
    try {
      return await this.service.findLogs(id);
    } catch (error) {
      this.handleControllerError(error, 'findLogs');
    }
  }

  /**
   * Cancel a task that has not started executing.
   */
  @Delete(':id')
  async cancel(@Param('id') id: string) {
    try {
      return await this.service.cancel(id);
    } catch (error) {
      this.handleControllerError(error, 'cancel');
    }
  }

  private handleControllerError(error: unknown, operation: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error(
      `Unexpected error in TaskController.${operation}`,
      error instanceof Error ? error.stack : String(error),
    );
    throw new InternalServerErrorException('Unexpected server error');
  }
}
