"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

type ClientConfig = { privyAppId: string };

export function VerseAuthProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/client-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Authentication configuration unavailable");
        return response.json() as Promise<ClientConfig>;
      })
      .then((value) => active && setConfig(value))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  if (failed) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080910] px-6 text-center text-white">
        <div>
          <p className="text-xl font-extrabold">Sign-in is temporarily unavailable</p>
          <p className="mt-2 text-sm text-white/50">The public Privy app configuration could not be loaded.</p>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080910] text-white">
        <span className="verse-gradient size-10 animate-pulse rounded-full" aria-label="Loading .verse" />
      </main>
    );
  }

  return (
    <PrivyProvider
      appId={config.privyAppId}
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
      {children}
    </PrivyProvider>
  );
}
