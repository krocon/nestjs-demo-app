import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { InMemoryTaskRepository } from '../../src/tasks/in-memory-task.repository.js';
import { createTestApp } from '../test-app.js';

describe('Task routes', () => {
  let app: NestExpressApplication;
  let repository: InMemoryTaskRepository;

  beforeEach(async () => {
    repository = new InMemoryTaskRepository();
    app = await createTestApp({ repository });
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('root returns hello with a link to the live demo', async () => {
    const response = await http().get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('Hello, NestJS!');
    expect(response.text).toContain('href="/live/"');
  });

  it('health check is UP', async () => {
    const response = await http().get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'UP' });
  });

  it('creates and fetches a task', async () => {
    const created = await http()
      .post('/tasks')
      .send({ title: '  Write tests  ' });

    expect(created.status).toBe(201);
    expect(created.headers.location).toBe('/tasks/1');
    expect(created.body).toEqual({ id: 1, title: 'Write tests', done: false });

    const fetched = await http().get('/tasks/1');
    expect(fetched.body).toEqual({ id: 1, title: 'Write tests', done: false });
  });

  it('lists tasks filtered by done', async () => {
    await repository.create('Open task');
    const closed = await repository.create('Closed task');
    await repository.update(closed.id, { done: true });

    const doneTasks = await http().get('/tasks?done=true');
    const openTasks = await http().get('/tasks?done=false');

    expect(doneTasks.body.map((t: { title: string }) => t.title)).toEqual([
      'Closed task',
    ]);
    expect(openTasks.body.map((t: { title: string }) => t.title)).toEqual([
      'Open task',
    ]);
  });

  it('rejects an invalid done filter', async () => {
    const response = await http().get('/tasks?done=yes');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'done must be true or false' });
  });

  it('patch marks a task as done and keeps the title', async () => {
    const task = await repository.create('Ship it');

    const response = await http()
      .patch(`/tasks/${task.id}`)
      .send({ done: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: task.id,
      title: 'Ship it',
      done: true,
    });
  });

  it('patch with an invalid done value is rejected', async () => {
    const task = await repository.create('Ship it');

    const response = await http()
      .patch(`/tasks/${task.id}`)
      .send({ done: 'yes' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'done must be true or false' });
  });

  it('delete removes a task, afterwards it is 404', async () => {
    const task = await repository.create('Temporary');

    const deleted = await http().delete(`/tasks/${task.id}`);
    const fetched = await http().get(`/tasks/${task.id}`);

    expect(deleted.status).toBe(204);
    expect(fetched.status).toBe(404);
  });

  it('blank title is rejected', async () => {
    const response = await http().post('/tasks').send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'title must not be blank' });
  });

  it('missing title is rejected', async () => {
    const response = await http().post('/tasks').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'title must be a string' });
  });

  it('too long title is rejected', async () => {
    const response = await http()
      .post('/tasks')
      .send({ title: 'x'.repeat(101) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'title must be at most 100 characters',
    });
  });

  it('a title with exactly 100 characters is accepted', async () => {
    const response = await http()
      .post('/tasks')
      .send({ title: 'x'.repeat(100) });

    expect(response.status).toBe(201);
  });

  it('invalid JSON is rejected with a JSON error', async () => {
    const response = await http()
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Request body must be valid JSON',
    });
  });

  it('unknown task returns 404 with a message', async () => {
    const response = await http().get('/tasks/42');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Task 42 not found' });
  });

  it('patch and delete of an unknown task return 404', async () => {
    const patched = await http().patch('/tasks/42').send({ done: true });
    const deleted = await http().delete('/tasks/42');

    expect(patched.status).toBe(404);
    expect(deleted.status).toBe(404);
  });

  it('non-numeric id returns 400', async () => {
    const response = await http().get('/tasks/abc');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'id must be a number' });
  });

  it('serves the live demo page', async () => {
    const response = await http().get('/live/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('NestJS Live Tasks');
  });

  it('unexpected errors become a 500 without details', async () => {
    const failing = new InMemoryTaskRepository();
    failing.findAll = () => Promise.reject(new Error('database on fire'));
    const failingApp = await createTestApp({ repository: failing });

    const response = await request(failingApp.getHttpServer()).get('/tasks');
    await failingApp.close();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });
});
