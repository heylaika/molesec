export type Nullish<T> = T | undefined | null;

/**
 * A simple function that checks if a value is not nullish.
 * @param variable any arbitrary variable
 */
export const hasValue = <T>(variable: Nullish<T>): variable is T =>
  variable !== undefined && variable !== null;
