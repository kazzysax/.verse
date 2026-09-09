"use client";

import { useEffect, useState } from "react";

export function AuthInitializationNotice({ ready }: { ready: boolean }) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setTimedOut(true), 15000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (ready) return null;

  return (
    <div role={timedOut ? "alert" : "status"} className="border-b bg-background px-4 py-3 text-center text-sm">
      <p>{timedOut
        ? "Sign-in could not connect. No verification code has been requested."
        : "Connecting to secure sign-in..."}</p>
      {timedOut && (
        <>
          <p className="mt-1 text-muted-foreground">If reloading does not help, contact support so we can check the sign-in configuration.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-2 underline underline-offset-4">Reload sign-in</button>
        </>
      )}
    </div>
  );
}
