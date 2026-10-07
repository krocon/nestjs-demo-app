/**
 * JSON in and out.
 *
 * Nest serializes returned objects to JSON automatically. Here we register the
 * JSON body parser ourselves (the default one is turned off in app.ts) so that
 * we can control its size limit and turn broken JSON into a clean 400 error.
 */
import { BadRequestException } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

export function configureJson(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: '100kb' });

  // Express error middleware (4 parameters) right after the parser.
  app.use(
    (
      error: unknown,
      _request: Request,
      _response: Response,
      next: NextFunction,
    ) => {
      next(
        error instanceof SyntaxError
          ? new BadRequestException('Request body must be valid JSON')
          : error,
      );
    },
  );

  // Pretty-print JSON responses – nicer to read in curl and in videos.
  app.set('json spaces', 2);
}
