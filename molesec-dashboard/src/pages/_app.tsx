import createEmotionCache from "@/createEmotionCache";
import { useStoreFallbackToken } from "@/hooks/useStoreFallbackToken";
import { theme } from "@/theme";
import * as amplitudeBrowserClient from "@amplitude/analytics-browser";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { CacheProvider, EmotionCache } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material/styles";
import { AppProps } from "next/app";
import Head from "next/head";

export interface ExtendedAppProps<T> extends AppProps<T> {
  emotionCache?: EmotionCache;
}

export type InjectedPageProps = {
  /** Access token used for supabase. */
  user?: { supabaseToken?: string };

  _sentryTraceData?: string;

  _sentryBaggage?: string;
};

const clientEmotionCache = createEmotionCache();

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
if (AMPLITUDE_API_KEY) amplitudeBrowserClient.init(AMPLITUDE_API_KEY);

export default function App({
  Component,
  pageProps,
  emotionCache = clientEmotionCache,
}: ExtendedAppProps<InjectedPageProps>) {
  useStoreFallbackToken(pageProps.user?.supabaseToken);

  return (
    <CacheProvider value={emotionCache}>
      <UserProvider user={pageProps.user}>
        <Head>
          <title>Mole Security - Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="description" content="Mole Security" />
          {pageProps._sentryTraceData && (
            <meta name="sentry-trace" content={pageProps._sentryTraceData} />
          )}
          {pageProps._sentryBaggage && (
            <meta name="sentry-baggage" content={pageProps._sentryBaggage} />
          )}
          <link rel="icon" href="/favicon.png" />
          <CssBaseline />
          <GlobalStyles
            styles={{
              "input::-webkit-outer-spin-button, input::-webkit-inner-spin-button":
                {
                  WebkitAppearance: "none",
                },
              "input[type=number]": {
                MozAppearance: "textfield",
              },
            }}
          />
        </Head>
        <ThemeProvider theme={theme}>
          <Component {...pageProps} />
        </ThemeProvider>
      </UserProvider>
    </CacheProvider>
  );
}
