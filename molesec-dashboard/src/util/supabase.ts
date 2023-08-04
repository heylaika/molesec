import { Database } from "@/generated-types/supabase.types";

export type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;

export type RowData<T extends TableName> = Tables[T]["Row"];
export type Insertion<T extends TableName> = Tables[T]["Insert"];
export type UpdateOf<T extends TableName> = Tables[T]["Update"];
