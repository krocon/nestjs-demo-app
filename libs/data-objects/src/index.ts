/**
 * @nestjs-demo/data-objects – the contract between server and browser.
 *
 * The NestJS backend and the Angular frontend both import their types from
 * here, never from each other. Rename a field and the TypeScript compiler
 * reports every place on *both* sides – fixed in one commit.
 *
 * This file is the only public entry point of the package.
 */
export { MAX_TITLE_LENGTH, type Task } from './task.js';
export { TaskEvents, type TaskEvent } from './task-event.js';
export { CreateTaskRequest, UpdateTaskRequest } from './task.dto.js';
export { assertNever } from './assert-never.js';
