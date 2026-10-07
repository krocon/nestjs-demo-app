# NestJS Demo App

A small, self-contained task API (to-dos) built with [NestJS](https://nestjs.com) and TypeScript.
It is the reference example for a series of one-minute videos — every file
focuses on **one** concept, so each video can point to exactly one place in the code.

Besides plain REST it shows live updates via **WebSockets** and **Server-Sent Events**,
plus a small browser demo page.

## Quick start

Requirements: **Node.js 22.12 or newer** (tested with Node 22.22 / 22.23; Node 24 LTS works too) and npm.

```bash
npm ci               # install the exact versions from package-lock.json
npm run start:dev    # start the server on http://localhost:8080 (restarts on changes)
npm test             # run all tests (Vitest)
npm run build        # compile to dist/
npm run start:prod   # run the compiled app: node dist/main.js
```

Quality checks:

```bash
npm run lint         # oxlint
npm run format       # prettier
npm run typecheck    # tsc --noEmit (sources and tests)
```

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
| GET    | `/live/`        | Browser demo page for the live features                 |

Rules:

- `title` must not be blank and may have at most 100 characters. Titles are trimmed when saved.
- Errors are always JSON: `{"message":"Task 42 not found"}`.
  `400` for validation errors, invalid JSON, a non-numeric id or an invalid `done` filter,
  `404` for unknown tasks, `500` for everything else (logged, no details sent to the client).
- The app starts with three sample tasks.

## Live updates (WebSockets & SSE)

Open <http://localhost:8080/live/> in two browser windows. Add, check or delete a task in one
window – the other one updates instantly. The page loads the current state via REST, receives
changes via WebSocket, creates tasks with a WebSocket text frame and reconnects automatically.

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

| Topic                                 | File                                                                                   |
|---------------------------------------|----------------------------------------------------------------------------------------|
| Starting the server, graceful shutdown | [`main.ts`](src/main.ts)                                                              |
| App factory & dependency injection    | [`app.ts`](src/app.ts)                                                                 |
| Root module                           | [`app.module.ts`](src/app.module.ts)                                                   |
| Routing basics (controller)           | [`root.controller.ts`](src/root.controller.ts)                                         |
| Health check                          | [`health.controller.ts`](src/health.controller.ts)                                     |
| Feature module (dynamic module)       | [`tasks/tasks.module.ts`](src/tasks/tasks.module.ts)                                   |
| REST routes / CRUD                    | [`tasks/tasks.controller.ts`](src/tasks/tasks.controller.ts)                           |
| Domain model                          | [`tasks/task.ts`](src/tasks/task.ts)                                                   |
| DTOs with validation rules            | [`tasks/task.dto.ts`](src/tasks/task.dto.ts)                                           |
| Repository pattern                    | [`tasks/task.repository.ts`](src/tasks/task.repository.ts)                             |
| In-memory storage                     | [`tasks/in-memory-task.repository.ts`](src/tasks/in-memory-task.repository.ts)         |
| Discriminated unions as JSON events   | [`tasks/task-event.ts`](src/tasks/task-event.ts)                                       |
| Pub/sub with RxJS                     | [`tasks/task-event-bus.ts`](src/tasks/task-event-bus.ts)                               |
| WebSocket gateway                     | [`live/tasks.gateway.ts`](src/live/tasks.gateway.ts)                                   |
| Server-Sent Events                    | [`live/task-events.controller.ts`](src/live/task-events.controller.ts)                 |
| WebSocket setup (WsAdapter)           | [`common/websockets.ts`](src/common/websockets.ts)                                     |
| Logging (middleware)                  | [`common/request-logging.middleware.ts`](src/common/request-logging.middleware.ts)     |
| JSON body parser                      | [`common/json.ts`](src/common/json.ts)                                                 |
| Validation (ValidationPipe)           | [`common/validation.ts`](src/common/validation.ts)                                     |
| Error handling (exception filter)     | [`common/all-exceptions.filter.ts`](src/common/all-exceptions.filter.ts)               |
| Static files                          | [`common/static-files.ts`](src/common/static-files.ts)                                 |
| Browser WebSocket client              | [`public/index.html`](public/index.html)                                               |
| Unit testing                          | [`in-memory-task.repository.spec.ts`](test/tasks/in-memory-task.repository.spec.ts)    |
| Testing routes (`@nestjs/testing`)    | [`tasks.controller.spec.ts`](test/tasks/tasks.controller.spec.ts), [`test-app.ts`](test/test-app.ts) |
| Testing WebSockets & SSE              | [`live.spec.ts`](test/live/live.spec.ts)                                               |
| Dependencies & scripts                | [`package.json`](package.json)                                                          |
| Docker                                | [`Dockerfile`](Dockerfile)                                                             |

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
| Coroutines / `suspend`     | `suspend fun`                               | `async` / `Promise`                                        |
| Pub/sub                    | `MutableSharedFlow`                         | RxJS `Subject` / `Observable`                              |
| Thread safety              | `ConcurrentHashMap`, `AtomicLong`           | Single-threaded event loop, plain `Map`                    |
| WebSockets                 | `install(WebSockets)`, `webSocket("/ws")`   | `WsAdapter` + `@WebSocketGateway({ path })`                |
| Server-Sent Events         | `install(SSE)`, `sse("/events")`            | `@Sse('events')` returning an `Observable`                 |
| Static files               | `staticResources("/live", "static")`        | `app.useStaticAssets(dir, { prefix: '/live/' })`          |
| Route tests                | `testApplication { … }`                     | `Test.createTestingModule()` + supertest                   |
| Test framework             | kotlin.test / JUnit                         | Vitest (the NestJS 12 default)                             |
| Build                      | Gradle + version catalog                    | npm + `package-lock.json`, Nest CLI                        |

## Configuration

| Variable | Default | Description      |
|----------|---------|------------------|
| `PORT`   | `8080`  | HTTP server port |

## Docker

```bash
docker build -t nestjs-demo .
docker run --rm -p 8080:8080 nestjs-demo
```

The image is built in two stages: the first one compiles TypeScript and removes dev
dependencies, the second one (`node:24-alpine`) only contains the compiled code,
production dependencies and the demo page, and runs as the unprivileged `node` user.

## Versions

NestJS 12 (ES modules), TypeScript 6, Vitest 5, Express 5, `ws` 8.
TypeScript stays on 6.x because the Nest CLI 12 is built against TypeScript 6.
