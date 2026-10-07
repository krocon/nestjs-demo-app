/**
 * Routing basics: the smallest possible controller.
 * GET / answers with a little HTML page.
 */
import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class RootController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  hello(): string {
    return `<h1>Hello, NestJS!</h1>
<p><a href="/live/">Open the live demo &rarr;</a></p>`;
  }
}
