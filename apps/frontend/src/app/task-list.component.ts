/**
 * The live task page – one component, all state in signals.
 *
 * 1. loads the list via REST (again after every reconnect),
 * 2. keeps it up to date with WebSocket events,
 * 3. creates tasks with a WebSocket text frame; check, rename and delete go
 *    through REST – the change comes back as an event, like for every client.
 */
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MAX_TITLE_LENGTH,
  type Task,
  type TaskEvent,
} from '@nestjs-demo/data-objects';
import { applyTaskEvent } from './apply-task-event';
import { TaskApiService } from './task-api.service';
import { TaskLiveService } from './task-live.service';

@Component({
  selector: 'app-task-list',
  template: `
    <main>
      <header>
        <h1>NestJS Live Tasks</h1>
        <span class="status" [class.on]="status() === 'live'">{{
          statusText[status()]
        }}</span>
      </header>

      <section>
        <h2>Tasks</h2>
        <form (submit)="$event.preventDefault(); add(newTitle)">
          <input
            #newTitle
            type="text"
            [maxLength]="maxTitleLength"
            autocomplete="off"
            placeholder="New task (sent via WebSocket)"
            aria-label="New task"
          />
          <button>Add</button>
        </form>
        @if (error(); as message) {
          <p class="error" role="alert">
            {{ message }}
            <button
              class="ghost"
              title="Dismiss"
              (click)="error.set(undefined)"
            >
              ✕
            </button>
          </p>
        }
        <ul>
          @for (task of tasks(); track task.id) {
            <li [class.done]="task.done">
              <input
                #done
                type="checkbox"
                [checked]="task.done"
                (change)="toggle(task, done)"
                aria-label="Done"
              />
              <span class="id">#{{ task.id }}</span>
              <input
                #title
                class="title"
                type="text"
                [value]="task.title"
                [maxLength]="maxTitleLength"
                (change)="rename(task, title)"
                aria-label="Title"
              />
              <button class="ghost" title="Delete" (click)="remove(task)">
                ✕
              </button>
            </li>
          }
        </ul>
      </section>

      <section>
        <h2>Events (WebSocket)</h2>
        <div class="log">
          @for (event of log(); track $index) {
            <div>
              <b>{{ event.type }}</b> {{ payload(event) }}
            </div>
          }
        </div>
      </section>
    </main>
  `,
})
export class TaskListComponent {
  private readonly api = inject(TaskApiService);
  private readonly live = inject(TaskLiveService);

  protected readonly maxTitleLength = MAX_TITLE_LENGTH;
  protected readonly status = this.live.status;
  protected readonly statusText = {
    connecting: 'connecting…',
    live: 'live',
    reconnecting: 'reconnecting…',
  };
  protected readonly tasks = signal<Task[]>([]);
  protected readonly log = signal<TaskEvent[]>([]);
  protected readonly error = signal<string | undefined>(undefined);

  constructor() {
    this.live.opened$.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
    this.live.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.tasks.update((tasks) => applyTaskEvent(tasks, event));
      this.log.update((log) => [event, ...log]);
    });
    this.live.connect();
  }

  protected add(input: HTMLInputElement): void {
    const title = input.value.trim();
    if (title && this.live.create({ title })) input.value = '';
  }

  protected toggle(task: Task, checkbox: HTMLInputElement): void {
    this.run(
      () => this.api.update(task.id, { done: checkbox.checked }),
      () => (checkbox.checked = task.done),
    );
  }

  protected rename(task: Task, input: HTMLInputElement): void {
    this.run(
      () => this.api.update(task.id, { title: input.value }),
      () => (input.value = task.title),
    );
  }

  protected remove(task: Task): void {
    this.run(() => this.api.delete(task.id));
  }

  protected payload(event: TaskEvent): string {
    return JSON.stringify(
      event.type === 'deleted' ? { id: event.id } : event.task,
    );
  }

  private reload(): void {
    this.run(async () => this.tasks.set(await this.api.list()));
  }

  /** Runs a REST call; on failure shows the server's {"message": …} and undoes the input. */
  private async run(
    call: () => Promise<unknown>,
    undo?: () => void,
  ): Promise<void> {
    this.error.set(undefined);
    try {
      await call();
    } catch (error) {
      undo?.();
      this.error.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? error.message)
          : String(error),
      );
    }
  }
}
