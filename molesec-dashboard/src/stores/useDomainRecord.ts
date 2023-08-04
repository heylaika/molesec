import { cud } from "@/util/store";
import { RowData } from "@/util/supabase";
import { create } from "zustand";

export type DomainRecord = Partial<{ [id: string]: RowData<"Domain"> }>;

export const useDomainRecord = cud<DomainRecord>(create(() => ({})));
