import type { NestExpressApplication } from '@nestjs/platform-express';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { TaskEventBus } from '../../src/tasks/task-event-bus.js';
import { assertNever, type TaskEvent } from '@nestjs-demo/data-objects';
import { createTestApp } from '../test-app.js';

/** Every wait in this file gives up after this many milliseconds instead of hanging. */
const TIMEOUT_MS = 2_000;

describe('Live endpoints (WebSocket & SSE)', () => {
  let app: NestExpressApplication;
  let eventBus: TaskEventBus;
  let baseUrl: string;
  const sockets: WebSocket[] = [];

  beforeEach(async () => {
    eventBus = new TaskEventBus();
    app = await createTestApp({ eventBus });
    // Live tests need a real port: WebSockets and streams don't work with in-memory requests.
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `127.0.0.1:${port}`;
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.terminate());
    sockets.length = 0;
    await app.close();
  });

  it('a WebSocket text frame creates a task and is broadcast back', async () => {
    const socket = await openSocket();

    const nextMessage = nextEvent(socket);
    socket.send('Created via WebSocket');
    const event = await nextMessage;

    expect(event).toEqual({
      type: 'created',
      task: { id: 1, title: 'Created via WebSocket', done: false },
    });
  });

  it('a REST DELETE is pushed to WebSocket clients', async () => {
    const socket = await openSocket();
    const firstMessage = nextEvent(socket);
    socket.send('Delete me');
    const created = await firstMessage;
    if (created.type !== 'created') throw new Error('expected a created event');

    const nextMessage = nextEvent(socket); // listen first – the event may beat the HTTP response
    await fetch(`http://${baseUrl}/tasks/${created.task.id}`, {
      method: 'DELETE',
    });
    const event = await nextMessage;

    expect(event).toEqual({ type: 'deleted', id: created.task.id });
  });

  it('REST changes arrive as created, updated and deleted events', async () => {
    const socket = await openSocket();
    const received = collectEvents(socket, 3);
    const json = { 'Content-Type': 'application/json' };

    await fetch(`http://${baseUrl}/tasks`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ title: 'Walk the dog' }),
    });
    await fetch(`http://${baseUrl}/tasks/1`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ done: true }),
    });
    await fetch(`http://${baseUrl}/tasks/1`, { method: 'DELETE' });

    expect((await received).map(describeEvent)).toEqual([
      'created #1 Walk the dog',
      'updated #1 done',
      'deleted #1',
    ]);
  });

  it('a REST POST arrives as a Server-Sent Event', async () => {
    const abort = new AbortController();
    const response = await fetch(`http://${baseUrl}/tasks/events`, {
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(TIMEOUT_MS)]),
    });
    await waitUntil(() => eventBus.subscriberCount === 1);

    await fetch(`http://${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Via SSE' }),
    });
    const message = await readUntil(response, '\n\n');
    abort.abort();

    expect(response.headers.get('content-type')).toMatch(/text\/event-stream/);
    expect(message).toContain('event: created');
    expect(message).toContain(
      'data: {"type":"created","task":{"id":1,"title":"Via SSE","done":false}}',
    );
  });

  it('blank WebSocket frames are ignored', async () => {
    const socket = await openSocket();
    const nextMessage = nextEvent(socket);

    socket.send('   ');
    socket.send('Real task');

    expect(await nextMessage).toMatchObject({
      type: 'created',
      task: { id: 1, title: 'Real task' },
    });
  });

  it('a closed WebSocket unsubscribes from the event bus', async () => {
    const socket = await openSocket();
    await waitUntil(() => eventBus.subscriberCount === 1);

    socket.close();
    await waitUntil(() => eventBus.subscriberCount === 0);

    expect(eventBus.subscriberCount).toBe(0);
  });

  it('an aborted SSE stream unsubscribes from the event bus', async () => {
    const abort = new AbortController();
    await fetch(`http://${baseUrl}/tasks/events`, { signal: abort.signal });
    await waitUntil(() => eventBus.subscriberCount === 1);

    abort.abort();
    await waitUntil(() => eventBus.subscriberCount === 0);

    expect(eventBus.subscriberCount).toBe(0);
  });

  // --- helpers ---------------------------------------------------------------

  async function openSocket(): Promise<WebSocket> {
    const socket = new WebSocket(`ws://${baseUrl}/ws/tasks`);
    sockets.push(socket);
    await withTimeout(
      new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
      }),
      'WebSocket open',
    );
    return socket;
  }
});

function nextEvent(socket: WebSocket): Promise<TaskEvent> {
  return withTimeout(
    new Promise((resolve) => {
      socket.once('message', (data) => resolve(JSON.parse(data.toString())));
    }),
    'WebSocket message',
  );
}

function collectEvents(socket: WebSocket, count: number): Promise<TaskEvent[]> {
  const events: TaskEvent[] = [];
  return withTimeout(
    new Promise((resolve) => {
      socket.on('message', (data) => {
        events.push(JSON.parse(data.toString()));
        if (events.length === count) resolve(events);
      });
    }),
    `${count} WebSocket messages`,
  );
}

/** The compiler checks that every event type is handled – see assertNever. */
function describeEvent(event: TaskEvent): string {
  switch (event.type) {
    case 'created':
      return `created #${event.task.id} ${event.task.title}`;
    case 'updated':
      return `updated #${event.task.id} ${event.task.done ? 'done' : 'open'}`;
    case 'deleted':
      return `deleted #${event.id}`;
    default:
      return assertNever(event);
  }
}

/** Reads a streamed response until `delimiter` shows up (e.g. the end of one SSE message). */
async function readUntil(
  response: Response,
  delimiter: string,
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (!text.includes(delimiter)) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  reader.releaseLock();
  return text;
}

async function waitUntil(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timed out waiting for ${what}`)),
        TIMEOUT_MS,
      ),
    ),
  ]);
}
