/**
 * Serves static files: the browser demo page in /public is available at /live/.
 */
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';

/** Works from src/ (tests) and dist/ (production): both are one level below apps/nestjs, the demo page lives in the repo root. */
const PUBLIC_DIR = join(import.meta.dirname, '..', '..', '..', '..', 'public');

export function configureStaticFiles(app: NestExpressApplication): void {
  app.useStaticAssets(PUBLIC_DIR, { prefix: '/live/' });
}
