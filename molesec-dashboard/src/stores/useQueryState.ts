import { Nullish } from "@/util/nullable";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type QueryState = {
  /** The current query */
  query: string;
  activeDataSourceId?: Nullish<string>;
};

export const useQueryState = create(
  persist<QueryState>(() => ({ query: "" }), { name: "query" })
);
