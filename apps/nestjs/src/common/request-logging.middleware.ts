/**
 * Request logging as functional middleware: logs method, path, status and duration
 * of every request – including static files and unknown routes.
 *
 *   [HTTP] GET /tasks 200 1.2ms
 */
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

export function requestLogging(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const start = performance.now();
  // 'close' fires when the response is finished – or when a stream (SSE) is aborted.
  response.on('close', () => {
    const duration = (performance.now() - start).toFixed(1);
    logger.log(
      `${request.method} ${request.originalUrl} ${response.statusCode} ${duration}ms`,
    );
  });
  next();
}
