import { PropsWithUserSession } from "@/api/server/withUserRequirements";
import { useKeepAliveSupabaseToken } from "@/hooks/useKeepAliveSupabaseToken";
import { useManageUser } from "@/hooks/useManageUser";
import { useActiveTeam } from "@/stores/useActiveTeam";
import { useUserMembershipRecord } from "@/stores/useUserMembershipRecord";
import { prehydrate } from "@/util/prehydrate";
import { SomeRecord } from "@/util/record";
import { useAsync, useInterval } from "react-use";

const CHECK_TEAM_INVITE_INTERVAL = 60 * 1000;

export const withUserSession = <P extends SomeRecord>(
  Component: React.ComponentType<PropsWithUserSession<P>>
) => {
  const ComponentWrapper = (props: PropsWithUserSession<P>) => {
    useKeepAliveSupabaseToken();

    const { fetchInvites } = useManageUser(props.user);
    useAsync(fetchInvites, [fetchInvites]);
    useInterval(fetchInvites, CHECK_TEAM_INVITE_INTERVAL);

    return <Component {...props} />;
  };

  return prehydrate(ComponentWrapper, (props) => {
    useUserMembershipRecord.setState(props.memberships, true);

    const activeTeam = props.activeTeamId
      ? props.memberships?.[props.activeTeamId]?.Team ?? null
      : null;

    useActiveTeam.setState(activeTeam, true);
  });
};
