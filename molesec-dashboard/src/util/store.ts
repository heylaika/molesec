import { prune, SomeRecord } from "@/util/record";
import { StoreApi, UseBoundStore } from "zustand";

/** A "create", "update" "delete" API for managing a record. */
export type CudApi<T extends SomeRecord> = {
  /** Adds an item at the end of the record with the specified key. */
  append: (key: keyof T, value: T[keyof T]) => void;
  /** Adds an item at the start of the record with the specified key. */
  prepend: (key: keyof T, value: T[keyof T]) => void;
  /**
   * Removes the item with the specified key from the record,
   * or all items matching the predicate.
   * Returns the number of removed items.
   */
  remove: (keyOrPredicate: keyof T | ((item: T[keyof T]) => boolean)) => number;
  /**
   * Replaces the item in the store, but only if an item already exists.
   * Returns true if the item was replaced, false otherwise.
   */
  replace: (
    keyOrSelector: keyof T | ((item: T[keyof T]) => boolean),
    valueOrReplacer: T[keyof T] | ((current: T[keyof T]) => T[keyof T])
  ) => boolean;
  /**
   * Replaces an item in the store, or adds it if it doesn't exist.
   */
  set: (key: keyof T, value: T[keyof T]) => void;
};

/**
 * Enhances a store with a statically accessible "create", "update" "delete" API.
 */
export const cud = <
  T extends SomeRecord,
  S extends UseBoundStore<StoreApi<T>> = UseBoundStore<StoreApi<T>>
>(
  store: S
): S & CudApi<T> => {
  const recordApi: CudApi<T> = {
    append: (key, value) =>
      store.setState((current) => ({ ...current, [key]: value }), true),
    prepend: (key, value) => {
      store.setState((current) => ({ [key]: value, ...current }), true);
    },
    remove: (keyOrPredicate) => {
      const record = store.getState();

      if (keyOrPredicate instanceof Function) {
        const next = prune(
          record,
          ([, value]) => value && keyOrPredicate(value)
        );
        store.setState(next, true);

        return Object.keys(record).length - Object.keys(next).length;
      } else if (keyOrPredicate in record) {
        const next = { ...record };
        delete next[keyOrPredicate];

        store.setState(next, true);

        return 1;
      } else {
        return 0;
      }
    },
    set: (key, value) => {
      const current = store.getState();
      const next = { ...current };
      next[key] = value;

      store.setState(next, true);
    },
    replace: (keyOrSelector, valueOrReplacer) => {
      const current = store.getState();

      if (keyOrSelector instanceof Function) {
        const next = { ...current };
        let replaced = false;

        for (const [key, value] of Object.entries(current)) {
          if (keyOrSelector(value)) {
            next[key as keyof T] =
              valueOrReplacer instanceof Function
                ? valueOrReplacer(value)
                : valueOrReplacer;
            replaced = true;
          }
        }

        return replaced;
      } else if (keyOrSelector in current) {
        const next = { ...current };
        next[keyOrSelector] =
          valueOrReplacer instanceof Function
            ? valueOrReplacer(current[keyOrSelector] as T[keyof T])
            : valueOrReplacer;

        store.setState(next, true);

        return true;
      } else {
        return false;
      }
    },
  };

  return Object.assign(store, recordApi);
};
