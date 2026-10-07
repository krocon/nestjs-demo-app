import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Task } from '@nestjs-demo/data-objects';
import { TaskApiService } from './task-api.service';

describe('TaskApiService', () => {
  let api: TaskApiService;
  let http: HttpTestingController;
  const task: Task = { id: 1, title: 'Learn TypeScript', done: false };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TaskApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() loads GET /tasks', async () => {
    const result = api.list();

    http.expectOne({ method: 'GET', url: '/tasks' }).flush([task]);

    expect(await result).toEqual([task]);
  });

  it('update() sends only the changed fields as PATCH body', async () => {
    const result = api.update(1, { done: true });

    const request = http.expectOne({ method: 'PATCH', url: '/tasks/1' });
    expect(request.request.body).toEqual({ done: true });
    request.flush({ ...task, done: true });

    expect(await result).toEqual({ ...task, done: true });
  });

  it('delete() sends DELETE /tasks/{id}', async () => {
    const result = api.delete(1);

    http
      .expectOne({ method: 'DELETE', url: '/tasks/1' })
      .flush(null, { status: 204, statusText: 'No Content' });

    await expect(result).resolves.toBeUndefined();
  });

  it('server errors keep their JSON message', async () => {
    const result = api.update(1, { title: '   ' });

    http
      .expectOne('/tasks/1')
      .flush(
        { message: 'title must not be blank' },
        { status: 400, statusText: 'Bad Request' },
      );

    await expect(result).rejects.toMatchObject({
      status: 400,
      error: { message: 'title must not be blank' },
    });
  });
});
