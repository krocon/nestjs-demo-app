/**
 * Enables WebSockets with the lightweight `ws` library (instead of Socket.IO).
 *
 * Nest's WsAdapter expects JSON frames like {"event":"…","data":…}. Our clients
 * simply send the task title as plain text, so a custom message parser wraps
 * every text frame into the CREATE_TASK_MESSAGE event of TasksGateway.
 */
import type { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';

export const CREATE_TASK_MESSAGE = 'create-task';

export function configureWebSockets(app: INestApplication): void {
  app.useWebSocketAdapter(
    new WsAdapter(app, {
      messageParser: (data) => ({
        event: CREATE_TASK_MESSAGE,
        data: data.toString(),
      }),
    }),
  );
}
