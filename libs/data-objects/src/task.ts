/**
 * The domain model: a single to-do item.
 *
 * Kotlin uses `Long` for ids – in TypeScript every number is a 64-bit float,
 * which represents integers exactly up to 2^53. Plenty for a demo.
 * `readonly` fields make tasks immutable: updates create a new object.
 */
export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

/**
 * Longest allowed title. It lives here, not in task.dto.ts, so the browser can
 * import the value without pulling in the class-validator decorators.
 */
export const MAX_TITLE_LENGTH = 100;
