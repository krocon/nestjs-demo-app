/**
 * The WebSocket connection to /ws/tasks – two-way, with automatic reconnect.
 *
 *   server -> browser: every TaskEvent as a JSON text frame  (events$)
 *   browser -> server: a plain text frame creates a task     (create())
 *
 * Events sent while the socket was down are lost, so `opened$` fires after
 * every (re)connect – the component then reloads the list via REST.
 */
import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  inject,
  signal,
} from '@angular/core';
import type { CreateTaskRequest, TaskEvent } from '@nestjs-demo/data-objects';
import { Subject } from 'rxjs';

export type LiveStatus = 'connecting' | 'live' | 'reconnecting';

const RECONNECT_DELAY_MS = 1_000;

@Injectable({ providedIn: 'root' })
export class TaskLiveService {
  private readonly location = inject(DOCUMENT).location;
  private readonly opened = new Subject<void>();
  private readonly events = new Subject<TaskEvent>();
  private socket?: WebSocket;
  private stopped = false;

  readonly status = signal<LiveStatus>('connecting');
  readonly opened$ = this.opened.asObservable();
  readonly events$ = this.events.asObservable();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopped = true;
      this.socket?.close();
    });
  }

  connect(): void {
    const protocol = this.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(
      `${protocol}://${this.location.host}/ws/tasks`,
    );
    socket.addEventListener('open', () => {
      this.status.set('live');
      this.opened.next();
    });
    socket.addEventListener('message', (message) => {
      this.events.next(JSON.parse(message.data) as TaskEvent);
    });
    socket.addEventListener('close', () => {
      if (this.stopped) return;
      this.status.set('reconnecting');
      setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
    });
    this.socket = socket;
  }

  /** Creating a task is just a text frame with the title (see TasksGateway). */
  create({ title }: CreateTaskRequest): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(title);
    return true;
  }
}
