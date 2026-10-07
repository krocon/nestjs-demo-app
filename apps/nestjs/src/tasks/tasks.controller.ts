/**
 * REST endpoints for tasks. Every change is published to the TaskEventBus.
 *
 *   GET    /tasks            list all tasks (optional ?done=true|false)
 *   GET    /tasks/{id}       get one task
 *   POST   /tasks            create a task
 *   PATCH  /tasks/{id}       update title and/or done
 *   DELETE /tasks/{id}       delete a task
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CreateTaskRequest,
  TaskEvents,
  UpdateTaskRequest,
  type Task,
} from '@nestjs-demo/data-objects';
import { TaskEventBus } from './task-event-bus.js';
import { TASK_REPOSITORY, type TaskRepository } from './task.repository.js';

/** Pipes convert and check route/query parameters before the handler runs. */
const taskId = new ParseIntPipe({
  exceptionFactory: () => new BadRequestException('id must be a number'),
});
const doneFilter = new ParseBoolPipe({
  optional: true,
  exceptionFactory: () => new BadRequestException('done must be true or false'),
});

@Controller('tasks')
export class TasksController {
  // Constructor injection: Nest passes in whatever AppModule registered.
  constructor(
    @Inject(TASK_REPOSITORY) private readonly repository: TaskRepository,
    private readonly eventBus: TaskEventBus,
  ) {}

  @Get()
  findAll(@Query('done', doneFilter) done?: boolean): Promise<Task[]> {
    return this.repository.findAll(done);
  }

  @Get(':id')
  async findOne(@Param('id', taskId) id: number): Promise<Task> {
    return (await this.repository.findById(id)) ?? notFound(id);
  }

  @Post() // POST answers with 201 Created by default
  async create(
    @Body() request: CreateTaskRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Task> {
    const task = await this.repository.create(request.title);
    this.eventBus.publish(TaskEvents.created(task));
    response.location(`/tasks/${task.id}`);
    return task;
  }

  @Patch(':id')
  async update(
    @Param('id', taskId) id: number,
    @Body() request: UpdateTaskRequest,
  ): Promise<Task> {
    const task = (await this.repository.update(id, request)) ?? notFound(id);
    this.eventBus.publish(TaskEvents.updated(task));
    return task;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', taskId) id: number): Promise<void> {
    if (!(await this.repository.delete(id))) notFound(id);
    this.eventBus.publish(TaskEvents.deleted(id));
  }
}

/** `never` tells TypeScript that this function always throws. */
function notFound(id: number): never {
  throw new NotFoundException(`Task ${id} not found`);
}
