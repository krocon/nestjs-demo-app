/**
 * Health check for load balancers and container orchestrators.
 * Returning an object makes Nest answer with JSON: {"status":"UP"}
 */
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'UP' };
  }
}
