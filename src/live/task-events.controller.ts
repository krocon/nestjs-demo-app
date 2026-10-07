/**
 * Server-Sent Events endpoint GET /tasks/events – one-way:
 * every task event is pushed to the client, the SSE event name is the event type.
 *
 *   event: created
 *   data: {"type":"created","task":{"id":4,"title":"Try NestJS","done":false}}
 */
import { Controller, MessageEvent, Req, Sse } from '@nestjs/common';
import type { Request } from 'express';
import { filter, map, type Observable } from 'rxjs';
import { TaskEventBus } from '../tasks/task-event-bus.js';

/**
 * Drop strategy for slow clients: while more than 1 MiB is still waiting in the
 * response's write buffer, new events for this client are dropped instead of
 * piling up in memory. Other clients are not affected.
 */
const MAX_BUFFERED_BYTES = 1024 * 1024;

@Controller('tasks')
export class TaskEventsController {
  constructor(private readonly eventBus: TaskEventBus) {}

  /**
   * @Sse turns an Observable into a text/event-stream response. When the client
   * disconnects, Nest unsubscribes from the Observable – and with it from the bus.
   */
  @Sse('events')
  events(@Req() request: Request): Observable<MessageEvent> {
    const response = request.res!;
    return this.eventBus.events$.pipe(
      filter(() => response.writableLength <= MAX_BUFFERED_BYTES),
      map((event) => ({ type: event.type, data: event })),
    );
  }
}
