import { InviteInfo } from "@/types/team";
import { cud } from "@/util/store";
import { create } from "zustand";

export type UserInviteRecord = { [teamId: string]: InviteInfo };

/** A record of the users' invites grouped by team id. */
export const useUserInviteRecord = cud<UserInviteRecord>(create(() => ({})));
