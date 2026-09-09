"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { VerseLoader } from "@/components/verse-loader";

type ClientConfig = { privyAppId: string };
type RuntimeProps = { appId: string; children: React.ReactNode };

const subscribeToStartupState = () => () => undefined;

export function VerseAuthProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [Runtime, setRuntime] = useState<ComponentType<RuntimeProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const showStartupLoader = useSyncExternalStore(
    subscribeToStartupState,
    () => window.sessionStorage.getItem("verse-app-ready") !== "1",
    () => false,
  );

  useEffect(() => {
    let active = true;
    const configRequest = fetch("/api/client-config", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Authentication configuration unavailable");
        return response.json() as Promise<ClientConfig>;
      });
    const runtimeRequest = import("@/components/privy-runtime").then((module) => module.PrivyRuntime);
    Promise.all([configRequest, runtimeRequest])
      .then(([value, PrivyRuntime]) => {
        if (!active) return;
        window.sessionStorage.setItem("verse-app-ready", "1");
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
          <p className="text-xl font-extrabold">Sign-in needs setup</p>
          <p className="mt-2 text-sm text-white/50">Refresh the page or try again shortly.</p>
        </div>
      </main>
    );
  }

  if (!config || !Runtime) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080910] text-white">
        {showStartupLoader && <VerseLoader className="size-20" />}
      </main>
    );
  }

  return <Runtime appId={config.privyAppId}>{children}</Runtime>;
}
