import React from "react";

/**
 * Returns the value `T` once the component has been rendered once.
 * This is useful when there may be mismatching content between the server and client.
 * https://nextjs.org/docs/messages/react-hydration-error
 *
 * E.g. the client may have something in `localStorage` on the initial render,
 * but you don't want to render that until the component has mounted (client side).
 */
export const useDeferred = <T>(value: T): T | undefined => {
  const [rendered, setRendered] = React.useState(false);

  React.useEffect(() => setRendered(true), [value]);

  return rendered ? value : undefined;
};
