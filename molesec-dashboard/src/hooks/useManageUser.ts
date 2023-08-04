import { InviteInfo, MembershipInfo } from "@/types/team";
import { AmplitudeEvent } from "@/util/amplitude-browser";
import { Nullish } from "@/util/nullable";
import { mapRecord } from "@/util/record";
import React from "react";
import { useUserInviteRecord } from "../stores/useUserInviteRecord";
import { useUserMembershipRecord } from "../stores/useUserMembershipRecord";
import { useDatabase } from "./useDatabase";
import { useLogger } from "./useLogger";

export type MembershipClaims = {
  sub?: Nullish<string>;
  user_id?: Nullish<string>;
  email?: Nullish<string>;
};

export const useManageUser = (claims: Nullish<MembershipClaims>) => {
  const { user_id = claims?.sub, email } = claims ?? {};

  const invites = useUserInviteRecord();
  const memberships = useUserMembershipRecord();
  const db = useDatabase();

  const fetchMemberships = React.useCallback(async () => {
    if (!user_id) return;

    const newMemberships = await db
      .from("TeamMembership")
      .select("*, Team (*)")
      .eq("user_id", user_id)
      .then(({ data }) => data);

    if (!newMemberships) return;

    useUserMembershipRecord.setState(
      mapRecord(newMemberships as MembershipInfo[], "team_id"),
      true
    );
  }, [db, user_id]);

  const { log, logError, logAsync } = useLogger();

  const createTeam = React.useCallback(
    async (name: string, orgName: string) => {
      if (!user_id || !email) {
        throw new Error("User ID or email not in user claims.");
      }

      const newTeam = await db
        .from("Team")
        .insert({ name, owner_user_id: user_id, org_name: orgName })
        .select("*")
        .then(({ data }) => data?.[0]);

      const event: AmplitudeEvent = {
        type: "TEAM_CREATE",
        payload: { team_id: newTeam?.id || "unknown" },
      };

      if (!newTeam) {
        const message = `Failed to create team: ${name}`;
        logError(event, message);
        throw new Error(message); // TODO: add app-wide error page to capture this.
      }

      try {
        await db.from("TeamMembership").insert({
          team_id: newTeam?.id,
          user_id,
          email,
        });
        log(event);
      } catch (error) {
        const message = "Failed to add the owner to the team. " + String(error);
        logError(event, message);
        throw new Error(message); // TODO: add app-wide error page to capture this.
      }

      await fetchMemberships();

      return newTeam;
    },
    [user_id, email, db, fetchMemberships, log, logError]
  );

  const fetchInvites = React.useCallback(async () => {
    if (!email) return;

    const { data: invites } = await db
      .from("TeamInvite")
      .select("*, Team (*)")
      .eq("email", email);

    if (!invites) return;

    useUserInviteRecord.setState(
      mapRecord(invites as InviteInfo[], "team_id"),
      true
    );
  }, [db, email]);

  const acceptInvite = React.useCallback(
    async (teamId: string) => {
      if (!user_id || !email) {
        throw new Error("Cannot accept invite without a user id or email.");
      }

      await logAsync(
        (async function () {
          await db
            .from("TeamMembership")
            .insert({ user_id, team_id: teamId, email });

          await db
            .from("TeamInvite")
            .delete()
            .eq("email", email)
            .eq("team_id", teamId);

          await Promise.all([fetchInvites(), fetchMemberships()]);
        })(),
        { type: "TEAM_ACCEPT_INVITE", payload: { team_id: teamId } }
      );
    },
    [db, fetchInvites, fetchMemberships, user_id, email, logAsync]
  );

  return {
    memberships,
    invites,
    createTeam,
    fetchMemberships,
    fetchInvites,
    acceptInvite,
  };
};
