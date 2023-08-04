import { clearDocumentCookies } from "@/util/cookie";
import React from "react";

export const useLogout = () => {
  return React.useCallback(() => {
    clearDocumentCookies();
    window.localStorage.clear();
    window.location.href = "/logout";
  }, []);
};
