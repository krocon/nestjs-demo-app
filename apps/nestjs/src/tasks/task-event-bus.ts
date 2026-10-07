/**
 * A tiny in-process pub/sub built on an RxJS Subject (≙ Kotlin's SharedFlow).
 * Routes publish events, every connected WebSocket / SSE client subscribes.
 *
 * Slow clients cannot block others: `publish()` hands the event to each
 * subscriber synchronously, and subscribers only *enqueue* data on their socket
 * (they never wait for the network). What happens when a socket's queue grows
 * too large is decided per transport – see live/tasks.gateway.ts and
 * live/task-events.controller.ts.
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import type { TaskEvent } from '@nestjs-demo/data-objects';

@Injectable()
export class TaskEventBus implements OnModuleDestroy {
  private readonly subject = new Subject<TaskEvent>();
  private subscribers = 0;

  /** Subscribe to receive every future event. Unsubscribe when the connection ends! */
  readonly events$: Observable<TaskEvent> = new Observable<TaskEvent>(
    (subscriber) => {
      this.subscribers++;
      const subscription = this.subject.subscribe(subscriber);
      return () => {
        this.subscribers--;
        subscription.unsubscribe();
      };
    },
  );

  publish(event: TaskEvent): void {
    this.subject.next(event);
  }

  /** Number of active subscriptions – lets tests prove that nothing leaks. */
  get subscriberCount(): number {
    return this.subscribers;
  }

  /** On shutdown: complete the stream, which ends all open SSE responses. */
  onModuleDestroy(): void {
    this.subject.complete();
  }
}
