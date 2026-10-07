/**
 * Exhaustiveness check for discriminated unions such as TaskEvent.
 *
 * In the `default` branch of `switch (event.type)` the compiler narrows the
 * value to `never` – but only if every variant has its own `case`. Add a new
 * variant to TaskEvent and every switch that forgets it stops compiling,
 * on the server and in the browser.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
