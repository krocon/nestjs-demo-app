/**
 * Serves static files: the production build of the Angular frontend
 * (apps/frontend) is available at /live/.
 *
 * The folder can be changed with the FRONTEND_DIR environment variable.
 */
import { join, resolve } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';

/** Works from src/ (tests) and dist/ (production): both are one level below apps/nestjs. */
const ANGULAR_BUILD_DIR = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'frontend',
  'dist',
  'browser',
);

export function configureStaticFiles(app: NestExpressApplication): void {
  const dir = resolve(process.env.FRONTEND_DIR ?? ANGULAR_BUILD_DIR);
  app.useStaticAssets(dir, { prefix: '/live/' });
}
