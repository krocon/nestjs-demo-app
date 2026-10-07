import { TaskEvents, type Task } from '@nestjs-demo/data-objects';
import { applyTaskEvent } from './apply-task-event';

describe('applyTaskEvent', () => {
  const learn: Task = { id: 1, title: 'Learn TypeScript', done: false };
  const build: Task = { id: 2, title: 'Build a NestJS API', done: false };

  it('created adds the task, sorted by id', () => {
    const tasks = applyTaskEvent([build], TaskEvents.created(learn));

    expect(tasks).toEqual([learn, build]);
  });

  it('created twice keeps a single copy', () => {
    const tasks = applyTaskEvent([learn], TaskEvents.created(learn));

    expect(tasks).toEqual([learn]);
  });

  it('updated replaces the task with the same id', () => {
    const done = { ...learn, done: true };

    const tasks = applyTaskEvent([learn, build], TaskEvents.updated(done));

    expect(tasks).toEqual([done, build]);
  });

  it('deleted removes the task', () => {
    const tasks = applyTaskEvent([learn, build], TaskEvents.deleted(1));

    expect(tasks).toEqual([build]);
  });

  it('returns a new array – signals compare by reference', () => {
    const before = [learn];

    const after = applyTaskEvent(before, TaskEvents.updated(learn));

    expect(after).not.toBe(before);
  });
});
