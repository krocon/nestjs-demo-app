/**
 * A Nest module bundles controllers and providers of one feature.
 *
 * `register()` makes it a *dynamic* module: the caller passes in the repository
 * and the event bus, so tests can hand over fresh instances.
 */
import { DynamicModule, Module } from '@nestjs/common';
import { TaskEventsController } from '../live/task-events.controller.js';
import { TasksGateway } from '../live/tasks.gateway.js';
import { TaskEventBus } from './task-event-bus.js';
import { TASK_REPOSITORY, type TaskRepository } from './task.repository.js';
import { TasksController } from './tasks.controller.js';

export interface TasksModuleOptions {
  repository: TaskRepository;
  eventBus: TaskEventBus;
}

@Module({})
export class TasksModule {
  static register({ repository, eventBus }: TasksModuleOptions): DynamicModule {
    return {
      module: TasksModule,
      controllers: [TasksController, TaskEventsController],
      providers: [
        { provide: TASK_REPOSITORY, useValue: repository },
        { provide: TaskEventBus, useValue: eventBus },
        TasksGateway,
      ],
    };
  }
}
