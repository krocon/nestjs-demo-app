/**
 * Test helper: builds the app with Nest's testing module and fresh dependencies.
 * Uses the same configuration as production (configureApp), but an empty
 * repository by default and no log output.
 */
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { appOptions, configureApp } from '../src/app.js';
import { AppModule } from '../src/app.module.js';
import { InMemoryTaskRepository } from '../src/tasks/in-memory-task.repository.js';
import { TaskEventBus } from '../src/tasks/task-event-bus.js';
import type { TaskRepository } from '../src/tasks/task.repository.js';

export async function createTestApp({
  repository = new InMemoryTaskRepository(),
  eventBus = new TaskEventBus(),
}: {
  repository?: TaskRepository;
  eventBus?: TaskEventBus;
} = {}): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register({ repository, eventBus })],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    ...appOptions,
    logger: false,
  });
  configureApp(app);
  return app.init();
}
