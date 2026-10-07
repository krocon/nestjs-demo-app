/**
 * Request validation with a global ValidationPipe.
 *
 * The pipe maps the JSON body onto its DTO class (see tasks/task.dto.ts),
 * runs the class-validator rules and rejects the request with 400 if any fail.
 */
import {
  BadRequestException,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';

export function configureValidation(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      // No `transform: true` – it would also coerce query strings like
      // ?done=yes into booleans before ParseBoolPipe can reject them.
      whitelist: true, // silently drop unknown fields
      stopAtFirstError: true, // one message per field is enough
      exceptionFactory: (errors) =>
        new BadRequestException(
          errors
            .flatMap((error) => Object.values(error.constraints ?? {}))
            .join(', ') || 'Invalid request body',
        ),
    }),
  );
}
