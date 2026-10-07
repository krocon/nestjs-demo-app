/**
 * WebSocket endpoint ws://localhost:8080/ws/tasks – two-way:
 *   server -> client: every task event as a JSON text frame
 *   client -> server: every text frame creates a new task
 *
 * A Nest "gateway" is the WebSocket counterpart of a controller.
 */
import { Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Subscription } from 'rxjs';
import { WebSocket } from 'ws';
import { MAX_TITLE_LENGTH, TaskEvents } from '@nestjs-demo/data-objects';
import { TaskEventBus } from '../tasks/task-event-bus.js';
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '../tasks/task.repository.js';
import { CREATE_TASK_MESSAGE } from '../common/websockets.js';

/**
 * Drop strategy for slow clients: if more than 1 MiB is still waiting in a
 * socket's send buffer, new events for *that* client are dropped. Other clients
 * are not affected, and memory per connection stays bounded. The demo page
 * reloads the full list via REST after a reconnect, so a dropped event is harmless.
 */
const MAX_BUFFERED_BYTES = 1024 * 1024;

@WebSocketGateway({ path: '/ws/tasks' })
export class TasksGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly logger = new Logger(TasksGateway.name);
  private readonly subscriptions = new Map<WebSocket, Subscription>();

  constructor(
    @Inject(TASK_REPOSITORY) private readonly repository: TaskRepository,
    private readonly eventBus: TaskEventBus,
  ) {}

  handleConnection(client: WebSocket): void {
    // No concurrent writes: JavaScript runs on one thread and ws.send() only
    // queues the frame, so frames from different events never interleave.
    const subscription = this.eventBus.events$.subscribe((event) => {
      if (client.bufferedAmount > MAX_BUFFERED_BYTES) {
        this.logger.warn(`Slow client, dropping "${event.type}" event`);
        return;
      }
      client.send(JSON.stringify(event));
    });
    this.subscriptions.set(client, subscription);
  }

  /** Unsubscribe from the bus when the connection ends – otherwise it would leak. */
  handleDisconnect(client: WebSocket): void {
    this.subscriptions.get(client)?.unsubscribe();
    this.subscriptions.delete(client);
  }

  /** Graceful shutdown: say goodbye with close code 1001 ("going away"). */
  onModuleDestroy(): void {
    for (const client of this.subscriptions.keys()) {
      client.close(1001, 'Server shutting down');
    }
  }

  /** Every plain text frame arrives here (see the message parser in common/websockets.ts). */
  @SubscribeMessage(CREATE_TASK_MESSAGE)
  async createTask(@MessageBody() text: string): Promise<void> {
    const title = text.trim();
    // Same rules as the REST API: blank or overlong titles are ignored.
    if (title.length === 0 || title.length > MAX_TITLE_LENGTH) return;

    const task = await this.repository.create(title);
    this.eventBus.publish(TaskEvents.created(task));
  }
}
