/**
 * Something that happened to a task. Sent to live clients as JSON, e.g.
 * {"type":"created","task":{"id":4,"title":"Try NestJS","done":false}}
 *
 * A discriminated union is TypeScript's counterpart to Kotlin's sealed classes:
 * the `type` field tells the variants apart, and `switch (event.type)` is
 * checked for exhaustiveness by the compiler. Because the discriminator is part
 * of the object, JSON.stringify() produces the wire format directly.
 */
import type { Task } from './task.js';

export type TaskEvent =
  | { readonly type: 'created'; readonly task: Task }
  | { readonly type: 'updated'; readonly task: Task }
  | { readonly type: 'deleted'; readonly id: number };

/** Small factory functions keep call sites short and typo-free. */
export const TaskEvents = {
  created: (task: Task): TaskEvent => ({ type: 'created', task }),
  updated: (task: Task): TaskEvent => ({ type: 'updated', task }),
  deleted: (id: number): TaskEvent => ({ type: 'deleted', id }),
};
