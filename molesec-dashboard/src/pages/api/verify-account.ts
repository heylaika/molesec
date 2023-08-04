import { handleLogin } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

export default async function verifyAccountApi(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await handleLogin(req, res, {
      authorizationParams: { prompt: "none" },
    });
  } catch (error) {
    res.status(500).end(String(error));
  }
}
