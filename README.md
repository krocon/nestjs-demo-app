# NestJS Demo App

A small, self-contained task app (to-dos) in **one language, one repo, one contract**:
a [NestJS](https://nestjs.com) backend, an [Angular](https://angular.dev) frontend and the
TypeScript types they share. It is the reference example for a series of one-minute videos —
every file focuses on **one** concept, so each video can point to exactly one place in the code.

Besides plain REST it shows live updates via **WebSockets** and **Server-Sent Events**,
plus a live task page in the browser.

## Repo map

```text
nestjs-demo-app/
├─ apps/
│  ├─ nestjs/          ← the NestJS backend (REST, WebSocket, SSE)
│  └─ frontend/        ← the Angular frontend, served at /live/
├─ libs/
│  └─ data-objects/    ← shared types & DTOs: Task, TaskEvent, CreateTaskRequest, UpdateTaskRequest
├─ package.json        ← root: "workspaces", shared scripts, ONE package-lock.json
├─ tsconfig.base.json  ← shared compiler options
├─ Dockerfile
├─ requests.http
└─ README.md
```

## Why a monorepo?

- One repo, three projects: backend, frontend and the contract between them.
- `libs/data-objects` **is** the contract. Backend and frontend import the same `Task`,
  `TaskEvent` and request DTOs – there is no second copy that could drift apart.
- One change = one commit = both sides checked: `npm run typecheck` compiles all three projects
  in one run (see [Try the contract](#try-the-contract)).
- Tooling: plain **npm workspaces** ("package-based"): every project has its own `package.json`,
  npm links them and keeps a single `package-lock.json`.
  Alternatives are [Nx](https://nx.dev) or the [Nest CLI monorepo mode](https://docs.nestjs.com/cli/monorepo).

## Quick start

Requirements: **Node.js 22.22.3+ or 24.15+** (Angular 22's minimum; the backend alone runs on 22.12+) and npm.

```bash
npm ci               # install all workspaces from the one package-lock.json (also builds data-objects)
npm run start:dev    # backend on :8080, frontend on http://localhost:4200 (proxy to :8080), all in watch mode
npm test             # run all tests: data-objects, backend, frontend (Vitest)
npm run build        # build data-objects -> nestjs -> frontend
npm run start:prod   # run the compiled backend; it serves the Angular build at http://localhost:8080/live/
```

Quality checks:

```bash
npm run typecheck    # type-check all three projects in one run
npm run lint         # oxlint
npm run format       # prettier
```

Run a script for a single project with `-w`, e.g. `npm test -w apps/nestjs`.

Try it:

```bash
curl http://localhost:8080/tasks
curl -i -X POST http://localhost:8080/tasks -H "Content-Type: application/json" -d '{"title":"Try NestJS"}'
```

Or open [`requests.http`](requests.http) in WebStorm / IntelliJ IDEA and click the ▶ icons.

## Endpoints

| Method | Path            | Description                                             |
|--------|-----------------|---------------------------------------------------------|
| GET    | `/`             | Hello world (HTML) with a link to `/live/`              |
| GET    | `/health`       | Health check: `{"status":"UP"}`                         |
| GET    | `/tasks`        | List tasks sorted by id (optional `?done=true\|false`)  |
| GET    | `/tasks/{id}`   | Get one task                                            |
| POST   | `/tasks`        | Create a task → `201` + `Location: /tasks/{id}`         |
| PATCH  | `/tasks/{id}`   | Update title and/or done                                |
| DELETE | `/tasks/{id}`   | Delete a task → `204`                                   |
| WS     | `/ws/tasks`     | Live task events; send a text frame to create a task    |
| GET    | `/tasks/events` | Live task events as Server-Sent Events                  |
| GET    | `/live/`        | The Angular frontend (production build)                 |

Rules:

- `title` must not be blank and may have at most 100 characters. Titles are trimmed when saved.
- Errors are always JSON: `{"message":"Task 42 not found"}`.
  `400` for validation errors, invalid JSON, a non-numeric id or an invalid `done` filter,
  `404` for unknown tasks, `500` for everything else (logged, no details sent to the client).
- The app starts with three sample tasks.

## Live updates (WebSockets & SSE)

Open <http://localhost:8080/live/> (or <http://localhost:4200> with `npm run start:dev`) in two
browser windows. Add, check, rename or delete a task in one window – the other one updates
instantly. The page loads the current state via REST, receives changes via WebSocket, creates
tasks with a WebSocket text frame, reconnects automatically (and reloads the list after a
reconnect) and shows the server's error messages.

Every change made through the REST API or the WebSocket is published to a `TaskEventBus`
(an RxJS `Subject`) and pushed to all connected clients as JSON:

```json
{"type":"created","task":{"id":4,"title":"Try NestJS","done":false}}
{"type":"updated","task":{"id":4,"title":"Try NestJS","done":true}}
{"type":"deleted","id":4}
```

From the terminal:

```bash
curl -N http://localhost:8080/tasks/events     # SSE stream, keep it open
websocat ws://localhost:8080/ws/tasks          # WebSocket, type a title + Enter
```

An SSE message looks like this (the event name is the event type):

```text
event: created
id: 1
data: {"type":"created","task":{"id":4,"title":"Try NestJS","done":false}}
```

Slow clients never block others: if more than 1 MiB is waiting in a client's send buffer,
new events for that client are dropped (see the comments in the live files).
Subscriptions end with the connection, so nothing leaks.

## Project map (one topic per file)

Shared contract – [`libs/data-objects`](libs/data-objects):

| Topic                                 | File                                                                                   |
|---------------------------------------|----------------------------------------------------------------------------------------|
| The contract: one public entry point  | [`index.ts`](libs/data-objects/src/index.ts)                                           |
| Domain model                          | [`task.ts`](libs/data-objects/src/task.ts)                                             |
| DTOs with validation rules            | [`task.dto.ts`](libs/data-objects/src/task.dto.ts)                                     |
| Discriminated unions as JSON events   | [`task-event.ts`](libs/data-objects/src/task-event.ts)                                 |
| Exhaustiveness check (`never`)        | [`assert-never.ts`](libs/data-objects/src/assert-never.ts)                             |
| Testing the wire format               | [`task-event.spec.ts`](libs/data-objects/test/task-event.spec.ts)                      |
| A package with `exports` and `.d.ts`  | [`package.json`](libs/data-objects/package.json)                                       |

Backend – [`apps/nestjs`](apps/nestjs):

| Topic                                 | File                                                                                   |
|---------------------------------------|----------------------------------------------------------------------------------------|
| Starting the server, graceful shutdown | [`main.ts`](apps/nestjs/src/main.ts)                                                  |
| App factory & dependency injection    | [`app.ts`](apps/nestjs/src/app.ts)                                                     |
| Root module                           | [`app.module.ts`](apps/nestjs/src/app.module.ts)                                       |
| Routing basics (controller)           | [`root.controller.ts`](apps/nestjs/src/root.controller.ts)                             |
| Health check                          | [`health.controller.ts`](apps/nestjs/src/health.controller.ts)                         |
| Feature module (dynamic module)       | [`tasks/tasks.module.ts`](apps/nestjs/src/tasks/tasks.module.ts)                       |
| REST routes / CRUD                    | [`tasks/tasks.controller.ts`](apps/nestjs/src/tasks/tasks.controller.ts)               |
| Repository pattern                    | [`tasks/task.repository.ts`](apps/nestjs/src/tasks/task.repository.ts)                 |
| In-memory storage                     | [`tasks/in-memory-task.repository.ts`](apps/nestjs/src/tasks/in-memory-task.repository.ts) |
| Pub/sub with RxJS                     | [`tasks/task-event-bus.ts`](apps/nestjs/src/tasks/task-event-bus.ts)                   |
| WebSocket gateway                     | [`live/tasks.gateway.ts`](apps/nestjs/src/live/tasks.gateway.ts)                       |
| Server-Sent Events                    | [`live/task-events.controller.ts`](apps/nestjs/src/live/task-events.controller.ts)     |
| WebSocket setup (WsAdapter)           | [`common/websockets.ts`](apps/nestjs/src/common/websockets.ts)                         |
| Logging (middleware)                  | [`common/request-logging.middleware.ts`](apps/nestjs/src/common/request-logging.middleware.ts) |
| JSON body parser                      | [`common/json.ts`](apps/nestjs/src/common/json.ts)                                     |
| Validation (ValidationPipe)           | [`common/validation.ts`](apps/nestjs/src/common/validation.ts)                         |
| Error handling (exception filter)     | [`common/all-exceptions.filter.ts`](apps/nestjs/src/common/all-exceptions.filter.ts)   |
| Static files (serves the frontend)    | [`common/static-files.ts`](apps/nestjs/src/common/static-files.ts)                     |
| Unit testing                          | [`in-memory-task.repository.spec.ts`](apps/nestjs/test/tasks/in-memory-task.repository.spec.ts) |
| Testing routes (`@nestjs/testing`)    | [`tasks.controller.spec.ts`](apps/nestjs/test/tasks/tasks.controller.spec.ts), [`test-app.ts`](apps/nestjs/test/test-app.ts) |
| Testing WebSockets & SSE              | [`live.spec.ts`](apps/nestjs/test/live/live.spec.ts)                                   |

Frontend – [`apps/frontend`](apps/frontend):

| Topic                                 | File                                                                                   |
|---------------------------------------|----------------------------------------------------------------------------------------|
| Bootstrapping a standalone app        | [`main.ts`](apps/frontend/src/main.ts)                                                 |
| The page: component + signals         | [`task-list.component.ts`](apps/frontend/src/app/task-list.component.ts)               |
| REST client (`HttpClient`)            | [`task-api.service.ts`](apps/frontend/src/app/task-api.service.ts)                     |
| WebSocket client with reconnect       | [`task-live.service.ts`](apps/frontend/src/app/task-live.service.ts)                   |
| Event + list → new list (`assertNever`) | [`apply-task-event.ts`](apps/frontend/src/app/apply-task-event.ts)                   |
| Testing a pure function               | [`apply-task-event.spec.ts`](apps/frontend/src/app/apply-task-event.spec.ts)           |
| Testing a service (`HttpTestingController`) | [`task-api.service.spec.ts`](apps/frontend/src/app/task-api.service.spec.ts)     |
| Dev-server proxy to the backend       | [`proxy.conf.json`](apps/frontend/proxy.conf.json)                                     |
| Build config, base href `/live/`      | [`angular.json`](apps/frontend/angular.json)                                           |

Repo:

| Topic                                 | File                                                                                   |
|---------------------------------------|----------------------------------------------------------------------------------------|
| Workspaces & shared scripts           | [`package.json`](package.json)                                                         |
| Shared compiler options               | [`tsconfig.base.json`](tsconfig.base.json)                                             |
| Docker                                | [`Dockerfile`](Dockerfile)                                                             |

## Try the contract

Rename a field in the contract and let the compiler find every place that has to change –
on the server **and** in the browser:

1. In [`libs/data-objects/src/task.ts`](libs/data-objects/src/task.ts) rename
   `readonly title: string;` to `readonly name: string;`.
2. Run `npm run typecheck` (it rebuilds data-objects first, then checks every project).
3. The compiler reports errors in all three projects (actual result of the first run):

   | Project               | Errors | Where                                                                                     |
   |-----------------------|-------:|-------------------------------------------------------------------------------------------|
   | `libs/data-objects`   | 2      | `test/task-event.spec.ts` (test data still uses `title`)                                  |
   | `apps/nestjs`         | 6      | `src/tasks/in-memory-task.repository.ts` (3), `test/live/live.spec.ts` (1), `test/tasks/in-memory-task.repository.spec.ts` (2) |
   | `apps/frontend`       | 1      | `src/app/task-list.component.ts` (undo of a rejected rename)                              |

   ```text
   src/tasks/in-memory-task.repository.ts(49,7): error TS2353: Object literal may only specify known properties, and 'title' does not exist in type 'Task'.
   src/app/task-list.component.ts:137:33 - error TS2339: Property 'title' does not exist on type 'Task'.
   ```

   Fix the frontend error and run it again: the Angular compiler then also checks the template
   (`[value]="task.title"`, 1 error) and the frontend tests (3 errors in 2 spec files).
4. Undo the change: `git checkout libs/data-objects/src/task.ts`.

The same works for the events: add a variant to `TaskEvent` and every `switch` with
`assertNever` (backend test and frontend) stops compiling until it handles the new case.

## Cheat sheet: Kotlin/Ktor → NestJS

This app mirrors [kotlin-ktor-demo-app](https://github.com/krocon/kotlin-ktor-demo-app) feature by feature.

| Concept                    | Ktor (Kotlin)                               | NestJS (TypeScript)                                        |
|----------------------------|---------------------------------------------|------------------------------------------------------------|
| Entry point                | `embeddedServer(Netty) { module() }`        | `NestFactory.create()` in `createApp()`, `app.listen()`    |
| Wiring                     | `Application.module(...)` with parameters   | Dynamic module `AppModule.register({ repository, eventBus })` |
| Dependency injection       | Function parameters                         | Constructor injection, `@Inject(TOKEN)` for interfaces     |
| Routes                     | `routing { get("/") { … } }`                | `@Controller()` classes with `@Get()`, `@Post()`, …        |
| Path / query parameters    | `call.parameters["id"]?.toLongOrNull()`     | `@Param('id', ParseIntPipe)`, `@Query('done', ParseBoolPipe)` |
| JSON                       | `ContentNegotiation` + kotlinx.serialization | Built in; body parser in `common/json.ts`                 |
| Data classes / DTOs        | `@Serializable data class`                  | `interface` (model), `class` with decorators (DTO)         |
| Nullable fields            | `String? = null`                            | Optional properties `title?: string`                       |
| Validation                 | `RequestValidation` plugin                  | `ValidationPipe` + class-validator decorators              |
| Error handling             | `StatusPages` plugin                        | Exception filter (`@Catch()`)                              |
| Logging                    | `CallLogging` plugin                        | Express middleware + Nest `Logger`                         |
| Sealed classes             | `sealed interface TaskEvent`                | Discriminated union `type TaskEvent = … \| …`             |
| Exhaustive `when`          | `when (event) { … }` without `else`         | `switch (event.type)` + `assertNever(event)`               |
| Coroutines / `suspend`     | `suspend fun`                               | `async` / `Promise`                                        |
| Pub/sub                    | `MutableSharedFlow`                         | RxJS `Subject` / `Observable`                              |
| Thread safety              | `ConcurrentHashMap`, `AtomicLong`           | Single-threaded event loop, plain `Map`                    |
| WebSockets                 | `install(WebSockets)`, `webSocket("/ws")`   | `WsAdapter` + `@WebSocketGateway({ path })`                |
| Server-Sent Events         | `install(SSE)`, `sse("/events")`            | `@Sse('events')` returning an `Observable`                 |
| Static files               | `staticResources("/live", "static")`        | `app.useStaticAssets(dir, { prefix: '/live/' })`          |
| Route tests                | `testApplication { … }`                     | `Test.createTestingModule()` + supertest                   |
| Test framework             | kotlin.test / JUnit                         | Vitest (the NestJS 12 and Angular 22 default)              |
| Build                      | Gradle + version catalog                    | npm + `package-lock.json`, Nest CLI, Angular CLI           |
| Multi-project build        | Gradle multi-project (`settings.gradle.kts`) | npm workspaces (`"workspaces"` in the root `package.json`) |

## Configuration

| Variable       | Default                      | Description                                  |
|----------------|------------------------------|----------------------------------------------|
| `PORT`         | `8080`                       | HTTP server port                             |
| `FRONTEND_DIR` | `apps/frontend/dist/browser` | Folder the backend serves at `/live/`        |

## Docker

```bash
docker build -t nestjs-demo .
docker run --rm -p 8080:8080 nestjs-demo
```

Then open <http://localhost:8080/live/>. The image is built in two stages: the first one installs
all workspaces and builds data-objects → nestjs → frontend, then reinstalls only the backend's
production dependencies. The second one (`node:24-alpine`) only contains the compiled backend,
the compiled contract, those production dependencies and the Angular build, and runs
`node apps/nestjs/dist/main.js` as the unprivileged `node` user.

## Versions

NestJS 12 (ES modules), Angular 22 (standalone components, signals, zoneless), TypeScript 6,
Vitest 5, Express 5, `ws` 8, npm workspaces.
All projects share one TypeScript version: TypeScript stays on 6.0.x because both the Nest CLI 12
and Angular 22 are built against it.
