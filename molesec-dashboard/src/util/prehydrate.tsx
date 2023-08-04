import React from "react";
import { SomeRecord } from "./record";

/**
 * A HOC that runs the hydration function ONCE before the component is rendered.
 * This allows you to set up zustand stores and similar before the component is rendered.
 */
export const prehydrate = <P extends SomeRecord>(
  Component: React.ComponentType<P>,
  hydrator: (props: P) => void
) => {
  let didHydrate = false;

  const Prehydrate = (props: P) => {
    const isServer = typeof window === "undefined";

    if (!didHydrate || isServer) {
      didHydrate = true;
      hydrator(props);
    }

    return <Component {...props} />;
  };

  return Prehydrate;
};
