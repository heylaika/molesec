import { cud } from "@/util/store";
import { RowData } from "@/util/supabase";
import { create } from "zustand";

type TeamChanges = Partial<RowData<"Team">>;

export const useEditTeam = cud<TeamChanges>(create(() => ({})));
