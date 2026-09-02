"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";
import { VerseBottomNav } from "@/components/verse-bottom-nav";
import { VerseLogo } from "@/components/verse-logo";
import { useVerseAuth } from "@/components/verse-auth-context";

export function VersePageShell({ children }: { children: ReactNode }) {
  const { authenticated, user } = useVerseAuth();
  const initials = (user?.email?.address ?? user?.twitter?.username ?? user?.telegram?.username ?? "ME").slice(0, 2).toUpperCase();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080910] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_50%_-10%,rgba(32,215,242,.23),transparent_36%),radial-gradient(circle_at_12%_2%,rgba(40,121,242,.20),transparent_31%),radial-gradient(circle_at_88%_0%,rgba(240,0,210,.18),transparent_30%)]" />
      <header className="relative z-20 px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="mx-auto flex max-w-[900px] items-center justify-between">
          <VerseLogo className="text-2xl text-white" />
          <div className="flex items-center gap-3">
            <Link href="/notifications" aria-label="Notifications" className="relative grid size-11 place-items-center rounded-full border border-white/10 bg-white/[.08] backdrop-blur-xl">
              <Bell className="size-5" />
            </Link>
            <Link href={authenticated ? "/profile" : "/signup"} aria-label={authenticated ? "Profile" : "Sign in"} className="verse-gradient grid size-11 place-items-center rounded-full p-0.5">
              <span className="grid size-full place-items-center rounded-full bg-[#171925] text-xs font-extrabold">{authenticated ? initials : "IN"}</span>
            </Link>
          </div>
        </div>
      </header>
      {children}
      <VerseBottomNav />
    </div>
  );
}
