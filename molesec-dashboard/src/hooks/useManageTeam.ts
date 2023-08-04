import { useActiveTeam } from "@/stores/useActiveTeam";
import { useTeamInviteRecord } from "@/stores/useTeamInviteRecord";
import { useTeamMembershipRecord } from "@/stores/useTeamMembershipRecord";
import { useUserMembershipRecord } from "@/stores/useUserMembershipRecord";
import { InviteInfo, MembershipInfo } from "@/types/team";
import { Nullish } from "@/util/nullable";
import { mapRecord } from "@/util/record";
import { RowData, UpdateOf } from "@/util/supabase";
import { useUser } from "@auth0/nextjs-auth0/client";
import React from "react";
import { useCleanTeam } from "./useCleanTeam";
import { useDatabase } from "./useDatabase";
import { useLogger } from "./useLogger";

export const useManageTeam = (team: Nullish<RowData<"Team">>) => {
  const { user } = useUser();
  const invites = useTeamInviteRecord();
  const memberships = useTeamMembershipRecord();
  const db = useDatabase();

  const fetchMemberships = React.useCallback(async () => {
    if (!team?.id) return;

    const newMemberships = await db
      .from("TeamMembership")
      .select("*, Team (*)")
      .eq("team_id", team.id)
      .then(({ data }) => data);

    if (!newMemberships) return;

    useTeamMembershipRecord.setState(
      mapRecord(newMemberships as MembershipInfo[], "user_id")
    );
  }, [db, team?.id]);

  const fetchInvites = React.useCallback(async () => {
    if (!team?.id) return;

    const newInvites = await db
      .from("TeamInvite")
      .select("*, Team (*)")
      .eq("team_id", team.id)
      .then(({ data }) => data);

    if (!newInvites) return;

    useTeamInviteRecord.setState(
      mapRecord(newInvites as InviteInfo[], "email")
    );
  }, [db, team?.id]);

  const updateTeam = React.useCallback(
    async (update: UpdateOf<"Team">) => {
      if (!team?.id) return;

      const updatedTeam = await db
        .from("Team")
        .update({ ...update, id: team.id })
        .eq("id", team.id)
        .select("*")
        .then(({ data }) => data?.[0]);

      if (!updatedTeam) {
        throw new Error(`Failed to update team ${team.id}`);
      }

      useTeamMembershipRecord.replace(
        (membership) => membership.team_id === team.id,
        (membership) => ({ ...membership, Team: updatedTeam })
      );
      useUserMembershipRecord.replace(team.id, (membership) => ({
        ...membership,
        Team: updatedTeam,
      }));

      if (useActiveTeam.getState()?.id === team.id) {
        useActiveTeam.setState(updatedTeam);
      }
    },
    [db, team?.id]
  );

  const { logAsync } = useLogger();

  const createInvite = React.useCallback(
    async (email: string, teamId: string) => {
      if (!user?.email) return;

      const createdInvite = await db
        .from("TeamInvite")
        .insert({
          email,
          team_id: teamId,
          inviter_email: user?.email,
        })
        .select("*, Team (*)")
        .then(({ data }) => data?.[0] as InviteInfo);

      if (!createdInvite) {
        throw new Error(`Failed to invite ${email}`);
      }
    },
    [db, user?.email]
  );

  const sendInvite = React.useCallback(
    async (email: string) => {
      const teamId = team?.id;
      if (!teamId) return;

      await logAsync(createInvite(email, teamId), {
        type: "TEAM_INVITE_NEW_MEMBER",
        payload: { team_id: teamId },
      });

      await fetchInvites();
    },
    [fetchInvites, team?.id, createInvite, logAsync]
  );

  const deleteTeam = React.useCallback(async () => {
    if (!team?.id) return;

    await db.from("Team").delete().eq("id", team.id);

    useUserMembershipRecord.remove(team.id);
    useTeamMembershipRecord.remove(
      (membership) => membership.team_id === team.id
    );
  }, [db, team?.id]);

  const deleteInvite = React.useCallback(
    async (email: string) => {
      if (!team) return;

      await logAsync(
        db
          .from("TeamInvite")
          .delete()
          .eq("email", email)
          .eq("team_id", team.id) as unknown as Promise<any>,
        { type: "TEAM_DELETE_INVITE", payload: { team_id: team.id } }
      );

      useTeamInviteRecord.remove(email);
    },
    [db, team, logAsync]
  );

  const cleanTeam = useCleanTeam();

  const deleteMembership = React.useCallback(
    async (user_id: string) => {
      if (!team) return;

      await db
        .from("TeamMembership")
        .delete()
        .eq("user_id", user_id)
        .eq("team_id", team.id);

      useTeamMembershipRecord.remove(user_id);
      const userLeavesTeam = user?.sub === user_id;
      if (userLeavesTeam) cleanTeam("/splash");
    },
    [db, team, user?.sub, cleanTeam]
  );

  return {
    invites,
    memberships,
    fetchMemberships,
    deleteMembership,
    fetchInvites,
    sendInvite,
    deleteInvite,
    updateTeam,
    deleteTeam,
  };
};
