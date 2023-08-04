import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from "next/router";
import React from "react";

export const useVerifyEmail = () => {
  const { user } = useUser();
  const router = useRouter();

  const verify = React.useCallback(() => {
    window.location.href = "/api/verify-account";
  }, []);

  React.useEffect(() => {
    if (user?.email_verified) router.replace("/splash");
  }, [user?.email_verified, router]);

  return { verify };
};
