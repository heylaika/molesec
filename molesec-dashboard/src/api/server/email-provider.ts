import { promises as dns } from "dns";

export type EmailProvider = "Google" | "Office365" | "Unknown";

export async function resolveEmailProvider(
  domain: string
): Promise<EmailProvider> {
  const records = await dns.resolveMx(domain).catch(() => []);
  const exchanges = records.map(({ exchange }) => exchange);

  if (exchanges.some(isOffice365Exchange)) {
    return "Office365";
  } else if (exchanges.some(isGoogleExchange)) {
    return (await validateGoogleExchange(domain)) ? "Google" : "Unknown";
  } else {
    return "Unknown";
  }
}

export async function validateGoogleExchange(domain: string) {
  return (await dns.resolveTxt(domain).catch(() => []))
    .flat()
    .some(isGoogleSPFRecord);
}

const isGoogleExchange = (exchange: string) => exchange.endsWith(".google.com");

const isOffice365Exchange = (exchange: string) =>
  exchange.endsWith(".protection.outlook.com");

const isGoogleSPFRecord = (value: string) =>
  /include:(\s+)?_spf.google.com\s+(~|-)all/.test(value);
