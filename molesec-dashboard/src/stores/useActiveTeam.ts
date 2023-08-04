import { RowData } from "@/util/supabase";
import { create } from "zustand";

export const useActiveTeam = create<RowData<"Team"> | null>(() => null);
