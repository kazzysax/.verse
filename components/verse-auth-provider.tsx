"use client";

import { useEffect, useState, type ComponentType } from "react";
import { emptyVerseAuth, VerseAuthContext } from "@/components/verse-auth-context";

type ClientConfig = { privyAppId: string };
type RuntimeProps = { appId: string; children: React.ReactNode };

function PreviewAuthRuntime({ children }: RuntimeProps) {
  return (
    <VerseAuthContext.Provider value={{ ...emptyVerseAuth, ready: true }}>
      {children}
    </VerseAuthContext.Provider>
  );
}

export function VerseAuthProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [Runtime, setRuntime] = useState<ComponentType<RuntimeProps> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const configRequest = fetch("/api/client-config", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Authentication configuration unavailable");
        return response.json() as Promise<ClientConfig>;
      });
    const runtimeRequest = window.location.protocol === "http:" && window.location.hostname === "terminal.local"
      ? Promise.resolve(PreviewAuthRuntime)
      : import("@/components/privy-runtime").then((module) => module.PrivyRuntime);
    Promise.all([configRequest, runtimeRequest])
      .then(([value, PrivyRuntime]) => {
        if (!active) return;
        setConfig(value);
        setRuntime(() => PrivyRuntime);
      })
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

  if (!config || !Runtime) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080910] text-white">
        <span className="verse-gradient size-10 animate-pulse rounded-full" aria-label="Loading .verse" />
      </main>
    );
  }

  return <Runtime appId={config.privyAppId}>{children}</Runtime>;
}
