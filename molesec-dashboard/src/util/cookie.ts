export const clearDocumentCookies = () => {
  if (typeof document === "undefined") return;

  const now = new Date();

  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + now.toUTCString() + ";path=/");
  });
};
