/**
 * Applies one live event to the task list – a pure function: list + event -> new list.
 *
 * `switch (event.type)` narrows the event to one variant per `case`. If the
 * contract gets a new variant, `assertNever(event)` no longer compiles –
 * the compiler points straight at this file.
 */
import {
  assertNever,
  type Task,
  type TaskEvent,
} from '@nestjs-demo/data-objects';

export function applyTaskEvent(
  tasks: readonly Task[],
  event: TaskEvent,
): Task[] {
  switch (event.type) {
    case 'created':
      return [
        ...tasks.filter((task) => task.id !== event.task.id),
        event.task,
      ].toSorted(byId);
    case 'updated':
      return tasks.map((task) =>
        task.id === event.task.id ? event.task : task,
      );
    case 'deleted':
      return tasks.filter((task) => task.id !== event.id);
    default:
      return assertNever(event);
  }
}

function byId(a: Task, b: Task): number {
  return a.id - b.id;
}
