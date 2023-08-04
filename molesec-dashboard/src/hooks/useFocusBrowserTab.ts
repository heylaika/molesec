import { hasValue } from "@/util/nullable";
import React from "react";

// https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
// We only track events when the page/tab is focused

const hasWindow = typeof window !== "undefined";

const browserPrefix = ["moz", "ms", "o", "webkit"];
const getPrefix = () => {
  if (!hasWindow) return null;
  if (typeof document.hidden !== "undefined") return null;

  const prefix = browserPrefix.find((prefix) => {
    const testPrefix = prefix + "Hidden";
    return testPrefix in document;
  });

  return prefix || null;
};

const prefixProperty = <T extends string>(
  prefix: string | null,
  property: T
) => {
  const capitalized = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);
  return prefix ? (`${prefix}${capitalized(property)}` as T) : (property as T);
};

const prefix = getPrefix();
const hidden = prefixProperty(prefix, "hidden");
const visibilityState = prefixProperty(prefix, "visibilityState");
const visibilityChange = prefixProperty(prefix, "visibilitychange");

/** Return true if the current browser tab is focused. */
export const useFocusBrowserTab = () => {
  const [isFocused, setIsFocused] = React.useState(
    hasWindow && document[visibilityState] === "visible"
  );

  const handleVisibilityChange = React.useCallback(() => {
    setIsFocused(!document[hidden]);
  }, []);

  React.useEffect(() => {
    if (hasWindow && hasValue(document[hidden])) {
      document.addEventListener(
        visibilityChange,
        handleVisibilityChange,
        false
      );
    }
    return () => {
      if (hasWindow) {
        document.removeEventListener(visibilityChange, handleVisibilityChange);
      }
    };
  }, [handleVisibilityChange]);

  return isFocused;
};
