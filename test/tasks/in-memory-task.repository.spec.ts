import { InMemoryTaskRepository } from '../../src/tasks/in-memory-task.repository.js';

describe('InMemoryTaskRepository', () => {
  let repository: InMemoryTaskRepository;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
  });

  it('assigns ids sequentially', async () => {
    const first = await repository.create('First');
    const second = await repository.create('Second');

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
  });

  it('trims titles when saving', async () => {
    const task = await repository.create('  Padded  ');

    expect(task.title).toBe('Padded');
  });

  it('update only changes the given fields', async () => {
    const task = await repository.create('Original');

    const updated = await repository.update(task.id, { done: true });

    expect(updated).toEqual({ id: task.id, title: 'Original', done: true });
  });

  it('update of an unknown id returns undefined', async () => {
    const updated = await repository.update(99, { title: 'Nope' });

    expect(updated).toBeUndefined();
  });

  it('delete returns whether a task was removed', async () => {
    const task = await repository.create('To delete');

    const firstDelete = await repository.delete(task.id);
    const secondDelete = await repository.delete(task.id);

    expect(firstDelete).toBe(true);
    expect(secondDelete).toBe(false);
  });

  it('findAll filters by done and sorts by id', async () => {
    await repository.create('Open');
    const closed = await repository.create('Closed');
    await repository.update(closed.id, { done: true });

    const doneTasks = await repository.findAll(true);
    const allTasks = await repository.findAll();

    expect(doneTasks.map((t) => t.title)).toEqual(['Closed']);
    expect(allTasks.map((t) => t.id)).toEqual([1, 2]);
  });
});
