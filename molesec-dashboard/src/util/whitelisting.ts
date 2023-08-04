export const google = {
  clientId: process.env.NEXT_PUBLIC_WHITELISTING_GOOGLE_APP_ID ?? "",
  clientScope: process.env.NEXT_PUBLIC_WHITELISTING_GOOGLE_CLIENT_SCOPE ?? "",
  addUrl: process.env.NEXT_PUBLIC_WHITELISTING_GOOGLE_ADD_URL ?? "",
};

if (!google.clientId || !google.clientScope || !google.addUrl) {
  throw new Error("Google whitelisting has not been configured");
}
