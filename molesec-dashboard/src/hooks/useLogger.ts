import { AmplitudeEvent, createLogger } from "@/util/amplitude-browser";
import { useUser } from "@supabase/auth-helpers-react";
import React from "react";

export const useLogger = () => {
  const user = useUser();

  const logger = React.useMemo(() => createLogger(user), [user]);

  const logError = React.useCallback(
    (event: AmplitudeEvent, message: string) => {
      logger({
        type: "SYSTEM_ERROR",
        payload: { event, message },
      });
    },
    [logger]
  );

  const logAsync = React.useCallback(
    async (promise: Promise<any>, event: AmplitudeEvent) => {
      try {
        logger(event);
        await promise;
      } catch (error) {
        logError(event, String(error));
      }
    },
    [logger, logError]
  );

  return {
    /** Logs an Amplitude event with user info. */
    log: logger,
    /**
     * Logs an Amplitude event along with a simple Promise.
     * For complex behaviors, use log and logError instead.
     */
    logAsync,
    /** Logs unexpected errors. */
    logError,
  };
};
