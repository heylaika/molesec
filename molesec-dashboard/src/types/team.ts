import { RowData } from "@/util/supabase";

export type MembershipInfo = RowData<"TeamMembership"> & {
  Team: RowData<"Team">;
};

export type InviteInfo = RowData<"TeamInvite"> & {
  Team: RowData<"Team">;
};
