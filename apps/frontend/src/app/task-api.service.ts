/**
 * REST calls to the backend: list, update and delete tasks.
 *
 * Request and response bodies use the shared contract. The DTO classes carry
 * class-validator decorators for the server – `import type` erases them at
 * compile time, so no validation code ends up in the browser bundle.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Task, UpdateTaskRequest } from '@nestjs-demo/data-objects';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);

  /** GET /tasks – the server returns the list sorted by id. */
  list(): Promise<Task[]> {
    return firstValueFrom(this.http.get<Task[]>('/tasks'));
  }

  /** PATCH /tasks/{id} – only the fields that are set get updated. */
  update(id: number, changes: UpdateTaskRequest): Promise<Task> {
    return firstValueFrom(this.http.patch<Task>(`/tasks/${id}`, changes));
  }

  /** DELETE /tasks/{id} – answers with 204 No Content. */
  async delete(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`/tasks/${id}`));
  }
}
