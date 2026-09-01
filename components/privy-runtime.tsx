"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { VerseAuthContext, type VerseAuthValue } from "@/components/verse-auth-context";

function PrivyBridge({ children }: { children: React.ReactNode }) {
  const privy = usePrivy();
  const value: VerseAuthValue = {
    ready: privy.ready,
    authenticated: privy.authenticated,
    user: privy.user,
    login: privy.login,
    logout: privy.logout,
    linkEmail: privy.linkEmail,
    getAccessToken: privy.getAccessToken,
  };
  return <VerseAuthContext.Provider value={value}>{children}</VerseAuthContext.Provider>;
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
        embeddedWallets: { ethereum: { createOnLogin: "off" } },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
