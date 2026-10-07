/**
 * Entry point of the browser app: starts the one and only component.
 */
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { TaskListComponent } from './app/task-list.component';

bootstrapApplication(TaskListComponent, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
  ],
}).catch((error) => console.error(error));
