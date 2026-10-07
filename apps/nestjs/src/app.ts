/**
 * The application factory: creates and configures the Nest app.
 *
 * Dependencies are parameters, so tests can pass in fresh instances.
 * main.ts uses the defaults (sample data), tests use empty repositories.
 */
import type { NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { configureJson } from './common/json.js';
import { requestLogging } from './common/request-logging.middleware.js';
import { configureStaticFiles } from './common/static-files.js';
import { configureValidation } from './common/validation.js';
import { configureWebSockets } from './common/websockets.js';
import { InMemoryTaskRepository } from './tasks/in-memory-task.repository.js';
import { TaskEventBus } from './tasks/task-event-bus.js';
import type { TaskRepository } from './tasks/task.repository.js';

export interface AppDependencies {
  repository?: TaskRepository;
  eventBus?: TaskEventBus;
}

/** Options for NestFactory.create() – shared with the tests. */
export const appOptions: NestApplicationOptions = {
  bodyParser: false, // registered in common/json.ts
  // "/tasks/events" must win over "/tasks/:id": literal paths are matched first.
  routeResolutionStrategy: 'specificity',
};

export async function createApp({
  repository = InMemoryTaskRepository.withSampleData(),
  eventBus = new TaskEventBus(),
}: AppDependencies = {}): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register({ repository, eventBus }),
    appOptions,
  );
  configureApp(app);
  return app;
}

/** Registers the cross-cutting concerns – each one lives in its own file in common/. */
export function configureApp(app: NestExpressApplication): void {
  app.use(requestLogging); // first, so it sees every request
  configureJson(app);
  configureValidation(app);
  app.useGlobalFilters(new AllExceptionsFilter());
  configureWebSockets(app);
  configureStaticFiles(app);
}
