import { MembershipInfo } from "@/types/team";
import { cud } from "@/util/store";
import { create } from "zustand";
export type UserMembershipRecord = { [teamId: string]: MembershipInfo };

/** A record of the users' memberships grouped by team id. */
export const useUserMembershipRecord = cud<UserMembershipRecord>(
  create(() => ({}))
);
