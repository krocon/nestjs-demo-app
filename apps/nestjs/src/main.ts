/**
 * Entry point: starts the HTTP server.
 * The port can be overridden with the PORT environment variable.
 */
import { Logger } from '@nestjs/common';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 8080);

const app = await createApp();

// Graceful shutdown: on SIGINT/SIGTERM Nest runs the lifecycle hooks
// (which end open SSE streams and close WebSockets with code 1001),
// closes the HTTP server and then exits.
app.enableShutdownHooks();

await app.listen(port, '0.0.0.0');
new Logger('Bootstrap').log(`Listening on http://localhost:${port}`);
