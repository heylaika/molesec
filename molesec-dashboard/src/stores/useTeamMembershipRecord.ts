import { MembershipInfo } from "@/types/team";
import { cud } from "@/util/store";
import { create } from "zustand";

export type TeamMembershipRecord = { [userId: string]: MembershipInfo };

/** A record of the teams' memberships grouped by user id. */
export const useTeamMembershipRecord = cud<TeamMembershipRecord>(
  create(() => ({}))
);
