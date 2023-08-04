import addDays from "date-fns/addDays";
import { NextApiRequest, NextApiResponse } from "next";
import { FetchError } from "./fetcher";

type NextRouteApi = (req: NextApiRequest, res: NextApiResponse) => any;

/**
 * A custom middleware that converts errors as the error responses.
 */
export const resolve = (api: NextRouteApi) => {
  return async function (req: NextApiRequest, res: NextApiResponse) {
    try {
      return api(req, res);
    } catch (error) {
      if (error instanceof FetchError) {
        return res.status(error.status || 500).json({ message: error.message });
      }
      return res.status(500).json({ message: String(error) });
    }
  };
};

export const cookieValue = (value = "", expiresInDays = 364) => {
  const valueString = value.trim().replace(/;$/, "");
  const expires = addDays(new Date(), expiresInDays).toUTCString();
  return `${valueString}; Path=/; Expires=${expires}`;
};
