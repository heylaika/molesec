/**
 * Return true if a valid email address.
 * The shortest possible valid example is "a@b.cd".
 */
export const isEmail = (text: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(text);

export const normalizeDomain = (domain: string) => domain.trim().toLowerCase();

export const getEmailDomain = (email: string) =>
  normalizeDomain(email.split("@").at(-1) ?? "");
