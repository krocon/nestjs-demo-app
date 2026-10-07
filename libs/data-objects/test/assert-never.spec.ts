import { describe, expect, it } from 'vitest';
import { assertNever } from '../src/index.js';

describe('assertNever', () => {
  it('throws if an unexpected value slips through at runtime', () => {
    // A server newer than the client could send a type the client does not know yet.
    const unknown = { type: 'archived' } as never;

    expect(() => assertNever(unknown)).toThrow(
      'Unexpected value: {"type":"archived"}',
    );
  });
});
