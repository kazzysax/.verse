"use client";

import { PrivyProvider, useLinkWithOAuth, useLoginWithEmail, useLoginWithOAuth, usePrivy } from "@privy-io/react-auth";
import { VerseAuthContext, type VerseAuthValue } from "@/components/verse-auth-context";
import { AuthInitializationNotice } from "@/components/auth-initialization-notice";

function PrivyBridge({ children }: { children: React.ReactNode }) {
  const privy = usePrivy();
  const emailLogin = useLoginWithEmail();
  const oauthLogin = useLoginWithOAuth();
  const oauthLink = useLinkWithOAuth();
  const value: VerseAuthValue = {
    ready: privy.ready,
    authenticated: privy.authenticated,
    user: privy.user,
    login: privy.login,
    logout: privy.logout,
    sendEmailCode: (email: string) => emailLogin.sendCode({ email }),
    loginWithEmailCode: (code: string) => emailLogin.loginWithCode({ code }),
    loginWithTwitter: () => oauthLogin.initOAuth({ provider: "twitter" }),
    loginWithTelegram: () => oauthLogin.initOAuth({ provider: "telegram" }),
    linkEmail: privy.linkEmail,
    linkTwitter: () => oauthLink.initOAuth({ provider: "twitter" }),
    linkTelegram: () => oauthLink.initOAuth({ provider: "telegram" }),
    getAccessToken: privy.getAccessToken,
  };
  return <VerseAuthContext.Provider value={value}><AuthInitializationNotice ready={privy.ready} />{children}</VerseAuthContext.Provider>;
}

export function PrivyRuntime({ appId, children }: { appId: string; children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "twitter", "telegram"],
        appearance: {
          theme: "dark",
          accentColor: "#b548f2",
          showWalletLoginFirst: false,
        },
        // The authenticated bootstrap endpoint creates the user-owned wallet.
        embeddedWallets: { ethereum: { createOnLogin: "off" } },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
