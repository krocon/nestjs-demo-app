/**
 * The root module: wires the feature modules and controllers together.
 */
import { DynamicModule, Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { RootController } from './root.controller.js';
import { TasksModule, type TasksModuleOptions } from './tasks/tasks.module.js';

@Module({})
export class AppModule {
  static register(options: TasksModuleOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [TasksModule.register(options)],
      controllers: [RootController, HealthController],
    };
  }
}
