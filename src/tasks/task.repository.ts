/**
 * Repository pattern: the storage abstraction for tasks.
 *
 * Controllers only know this interface. Swap the implementation
 * (e.g. for a database) without touching the routes.
 *
 * TypeScript interfaces vanish at runtime, so Nest's dependency injection
 * needs a token to find the implementation: TASK_REPOSITORY.
 */
import type { Task } from './task.js';
import type { UpdateTaskRequest } from './task.dto.js';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

/** Methods return Promises (≙ Kotlin `suspend`), so a database can be plugged in later. */
export interface TaskRepository {
  findAll(done?: boolean): Promise<Task[]>;
  findById(id: number): Promise<Task | undefined>;
  create(title: string): Promise<Task>;
  update(id: number, changes: UpdateTaskRequest): Promise<Task | undefined>;
  delete(id: number): Promise<boolean>;
}
