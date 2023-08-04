import { InviteInfo } from "@/types/team";
import { cud } from "@/util/store";
import { create } from "zustand";

export type TeamInviteRecord = { [email: string]: InviteInfo };

/** A record of the teams' invites grouped by email. */
export const useTeamInviteRecord = cud<TeamInviteRecord>(create(() => ({})));
