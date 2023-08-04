import { track } from "@amplitude/analytics-browser";
import { UserClaims } from "./auth";
import { Nullish } from "./nullable";

type TeamEventPayload<T extends Record<string, any> = {}> = {
  team_id: string;
} & T;

export type AmplitudeEvent =
  | {
      type: "TEAM_CREATE";
      payload: TeamEventPayload;
    }
  | {
      type: "TEAM_SELECT";
      payload: TeamEventPayload;
    }
  | {
      type: "TEAM_ACCEPT_INVITE";
      payload: TeamEventPayload;
    }
  | {
      type: "TEAM_DELETE_INVITE";
      payload: TeamEventPayload;
    }
  | {
      type: "TEAM_INVITE_NEW_MEMBER";
      payload: TeamEventPayload;
    }
  | {
      type: "SYSTEM_ERROR";
      payload: {
        event?: AmplitudeEvent;
        message: string;
      };
    };

export const createLogger =
  (user: Nullish<Partial<Nullish<UserClaims>>> = {}) =>
  (event: AmplitudeEvent) =>
    track(event.type, { ...getUserInfo(user), ...event.payload });

const getUserInfo = (claims: Nullish<Partial<UserClaims>>) => ({
  user_id: claims?.sub || "unknown",
  email: claims?.email || "unknown",
});
