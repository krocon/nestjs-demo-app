import { describe, expect, it } from 'vitest';
import { TaskEvents } from '../src/index.js';

describe('TaskEvents', () => {
  const task = { id: 4, title: 'Try NestJS', done: false };

  it('created events carry the task', () => {
    expect(JSON.stringify(TaskEvents.created(task))).toBe(
      '{"type":"created","task":{"id":4,"title":"Try NestJS","done":false}}',
    );
  });

  it('updated events carry the task', () => {
    expect(JSON.stringify(TaskEvents.updated({ ...task, done: true }))).toBe(
      '{"type":"updated","task":{"id":4,"title":"Try NestJS","done":true}}',
    );
  });

  it('deleted events only carry the id', () => {
    expect(JSON.stringify(TaskEvents.deleted(4))).toBe(
      '{"type":"deleted","id":4}',
    );
  });
});
