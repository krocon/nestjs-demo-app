/**
 * Thread-safe, in-memory implementation of TaskRepository. Data is lost on restart.
 *
 * Why is a plain Map "thread-safe" here? Node.js runs JavaScript on a single thread
 * (the event loop). Each method below runs to completion without an `await` in
 * between, so two requests can never interleave inside one operation – no locks
 * needed (Kotlin needs ConcurrentHashMap + AtomicLong for the same guarantee).
 */
import type { Task, UpdateTaskRequest } from '@nestjs-demo/data-objects';
import type { TaskRepository } from './task.repository.js';

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<number, Task>();
  private nextId = 1;

  /** A repository pre-filled with a few tasks, handy for demos. */
  static withSampleData(): InMemoryTaskRepository {
    const repository = new InMemoryTaskRepository();
    repository.add('Learn TypeScript');
    repository.add('Build a NestJS API');
    repository.add('Record a one-minute video');
    return repository;
  }

  async findAll(done?: boolean): Promise<Task[]> {
    return [...this.tasks.values()]
      .filter((task) => done === undefined || task.done === done)
      .toSorted((a, b) => a.id - b.id);
  }

  async findById(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async create(title: string): Promise<Task> {
    return this.add(title);
  }

  async update(
    id: number,
    changes: UpdateTaskRequest,
  ): Promise<Task | undefined> {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;

    // `??` keeps the old value when a field was not sent (≙ Kotlin's `?:`).
    const updated: Task = {
      ...existing,
      title: changes.title?.trim() ?? existing.title,
      done: changes.done ?? existing.done,
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  private add(title: string): Task {
    const task: Task = { id: this.nextId++, title: title.trim(), done: false };
    this.tasks.set(task.id, task);
    return task;
  }
}
