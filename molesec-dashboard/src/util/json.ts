import { Json } from "@/generated-types/supabase.types";
import { Prisma } from "@prisma/client";
import { SomeRecord } from "./record";

/**
 * Converts `Date` objects to strings and JSON-like values from Prisma/Supabase to `any`
 * to help with interoperability between the two libraries.
 *
 * This ensures that e.g. `JSONNormalized<RowData<"DataQuery">>` is equivalent to
 * with `JSONNormalized<DataQuery>` and can be used in both supabase and Prisma contexts.
 *
 * To force the correct type, you can use `reserialize`.
 */
export type JSONNormalized<T extends SomeRecord> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
    ? string | null
    : T[K] extends SomeRecord
    ? JSONNormalized<T[K]>
    : T[K] extends Prisma.JsonValue | Json
    ? any
    : T[K];
};

export const reserialize = <T extends SomeRecord>(
  record: T
): JSONNormalized<T> => JSON.parse(JSON.stringify(record)) as JSONNormalized<T>;
