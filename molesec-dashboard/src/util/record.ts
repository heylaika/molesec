import { hasValue } from "./nullable";

export type SomeRecord = Record<string, any>;
export type PropsOf<T extends SomeRecord> = readonly (keyof T)[];
export type EntryPredicate<T extends SomeRecord> = (
  args: [keyof T, T[keyof T]]
) => boolean;

/**
 * Returns the properties of the record T as a typed array.
 * Only call this when you are sure that T does not include any extra properties.
 */
const propsOf = <T extends SomeRecord>(record: T): PropsOf<T> =>
  Object.keys(record);

/** Returns a shallow copy of the record T with the properties P excluded. */
export const omit = <T extends SomeRecord, P extends PropsOf<T>>(
  record: T,
  ...keys: P
): Omit<T, P[number]> => {
  const result: Partial<T> = {};

  propsOf(record).forEach((key) => {
    // It's fine to have O(n^2) here.
    // Note that, in practice, the length of keys is usually very small.
    // Converting `keys` to an object would make the overall operation slower.
    if (!keys.includes(key)) result[key] = record[key];
  });

  return result as Omit<T, P[number]>;
};

/** Returns a shallow copy of the record T with only the properties P included. */
export const pick = <T extends SomeRecord, P extends PropsOf<T>>(
  record: T,
  ...props: P
): Pick<T, P[number]> => {
  const result: Partial<T> = {};

  for (const prop of props) {
    if (prop in record) {
      result[prop] = record[prop];
    }
  }

  return result as Pick<T, P[number]>;
};

/**
 * Removes some undesired properties from the record T.
 * By default, it removes all properties with nullish values.
 */
export const prune = <T extends SomeRecord, R extends SomeRecord = T>(
  record: T,
  predicate: EntryPredicate<T> = ([, value]) => hasValue(value)
) => Object.fromEntries(Object.entries(record).filter(predicate)) as R;

/** Checks whether a record has the expected properties from another. */
export const equalsShallow = <T extends SomeRecord, A extends T>(
  expected: T,
  actual: A,
  props = propsOf(expected)
) => props.every((prop) => actual[prop] === expected[prop]);

export const mapRecord = <
  T extends Object,
  S extends keyof T | ((record: T) => string)
>(
  arr: T[],
  key: S
) => {
  const getKey = (item: T) =>
    key instanceof Function ? key(item) : (item as any)[key];

  return Object.fromEntries(
    arr.map((obj) => [getKey(obj), obj]).filter(([key]) => hasValue(key))
  ) as Record<S extends keyof T ? keyof T : string, T>;
};

export const isRecord = (value: unknown): value is SomeRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
