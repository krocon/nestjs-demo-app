/**
 * DTOs (data transfer objects) for request bodies – including their validation rules.
 *
 * DTOs are classes, not interfaces, because the decorators of `class-validator`
 * need a runtime value to attach to. The global ValidationPipe
 * (see apps/nestjs/src/common/validation.ts) checks them before a controller method runs.
 *
 * Good to know: decorators are applied bottom-up, so the rule closest to the
 * property is checked first. With `stopAtFirstError` only that message is reported.
 */
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MAX_TITLE_LENGTH } from './task.js';

/** Body of POST /tasks. */
export class CreateTaskRequest {
  @MaxLength(MAX_TITLE_LENGTH, {
    message: `title must be at most ${MAX_TITLE_LENGTH} characters`,
  })
  @Matches(/\S/, { message: 'title must not be blank' })
  @IsString({ message: 'title must be a string' })
  title: string;
}

/**
 * Body of PATCH /tasks/{id}. Only fields that are set get updated.
 * `?` is TypeScript's counterpart to Kotlin's nullable types with default `null`.
 */
export class UpdateTaskRequest {
  @MaxLength(MAX_TITLE_LENGTH, {
    message: `title must be at most ${MAX_TITLE_LENGTH} characters`,
  })
  @Matches(/\S/, { message: 'title must not be blank' })
  @IsString({ message: 'title must be a string' })
  @IsOptional()
  title?: string;

  @IsBoolean({ message: 'done must be true or false' })
  @IsOptional()
  done?: boolean;
}
