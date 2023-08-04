import * as Sentry from "@sentry/nextjs";
import { IncomingMessage } from "http";

export const newServerTransaction = (req: IncomingMessage) => {
  const transaction = Sentry.getCurrentHub().startTransaction({
    name: "http.server",
    description: req.url,
    traceId: req.headers["sentry-trace"]?.toString(),
  });
  (req as any)["_sentryTransaction"] = transaction;

  return transaction;
};

type Transaction = ReturnType<typeof newServerTransaction>;

export const getServerTransaction = (req: IncomingMessage) => {
  if (typeof (req as any)["_sentryTransaction"] === "object") {
    return (req as any)["_sentryTransaction"] as Transaction;
  } else {
    return ((req as any)["_sentryTransaction"] = newServerTransaction(req));
  }
};
