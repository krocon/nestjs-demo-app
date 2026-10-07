/**
 * Error handling: an exception filter that turns *every* error into JSON.
 *
 *   400 / 404 / …  {"message":"Task 42 not found"}   (HttpException and subclasses)
 *   500            {"message":"Internal server error"} (anything else – logged, never leaked)
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      this.logger.error(
        'Unhandled error',
        exception instanceof Error ? exception.stack : exception,
      );
      return;
    }
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.toError(exception);
    if (response.headersSent) return; // e.g. a stream that already started

    response.status(status).json({ message });
  }

  private toError(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message;
      return {
        status: exception.getStatus(),
        message: Array.isArray(message)
          ? message.join(', ')
          : (message ?? exception.message),
      };
    }
    this.logger.error(
      'Unhandled error',
      exception instanceof Error ? exception.stack : exception,
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
