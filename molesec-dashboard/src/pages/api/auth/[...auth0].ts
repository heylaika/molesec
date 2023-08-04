import { getServerTransaction } from "@/util/sentry";
import { AfterCallback, handleAuth, handleCallback } from "@auth0/nextjs-auth0";
import { AuthorizationParameters } from "@auth0/nextjs-auth0/dist/config";

// https://github.com/auth0/nextjs-auth0/tree/main/examples
const BASE_URL = process.env.AUTH0_BASE_URL ?? "";

const afterCallback: AfterCallback = async (req, res, session) => {
  console.info(`Adding Supabase accessToken to ${session.user.email}.`);

  return session;
};

const authorizationParams: Partial<AuthorizationParameters> = {
  redirect_uri: BASE_URL + "/api/auth/callback",
  request_uri: BASE_URL + "/api/auth/authorize",
};

export default handleAuth({
  async callback(req, res) {
    const transaction = getServerTransaction(req);
    const span = transaction.startChild({
      op: "auth0",
      description: `handleAuth.callback (${req.url})`,
    });

    try {
      await handleCallback(req, res, { afterCallback, authorizationParams });
    } catch (error) {
      res.status(500).end(String(error));
    } finally {
      span.finish();
      transaction.finish();
    }
  },
});
