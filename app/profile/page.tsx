"use client";

import Link from "next/link";
import { AtSign, ChevronRight, Copy, LogOut, Mail, Send, ShieldCheck } from "lucide-react";
import { VersePageShell } from "@/components/verse-page-shell";
import { useVerseAccount } from "@/components/use-verse-account";

export default function ProfilePage() {
  const account = useVerseAccount();
  const primaryName = account.profile?.domains.find((domain) => domain.primary)?.name ?? account.profile?.domains[0]?.name;
  const initials = (primaryName ?? account.profile?.email ?? "VE").slice(0, 2).toUpperCase();
  const linkedIdentities = account.profile?.identities.filter((identity) => identity.verified) ?? [];
  const copyName = async () => {
    if (primaryName) await navigator.clipboard?.writeText(primaryName);
  };

  return (
    <VersePageShell>
      <main className="relative z-10 mx-auto max-w-[720px] px-4 pb-32 pt-11 sm:px-8">
        <section className="text-center">
          <div className="verse-gradient mx-auto grid size-24 place-items-center rounded-full p-1 shadow-[0_22px_60px_rgba(132,58,240,.28)]">
            <div className="grid size-full place-items-center rounded-full bg-[#151722] text-2xl font-extrabold">{initials}</div>
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.055em]">{primaryName ?? (account.authenticated ? "Claim your .verse name" : ".verse profile")}</h1>
          <p className="mt-2 text-sm text-white/45">Your payment identity</p>
          {!account.authenticated && <button type="button" onClick={() => account.login({ loginMethods: ["email"] })} className="verse-gradient mt-5 rounded-full px-6 py-3 text-sm font-extrabold">Sign in to manage profile</button>}
        </section>

        <section className="mt-9 overflow-hidden rounded-[30px] border border-white/[.08] bg-[#13151f]/90 p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">Primary name</p>
              <p className="mt-2 text-xl font-extrabold">{primaryName ?? "No name claimed"}</p>
            </div>
            <button type="button" onClick={copyName} disabled={!primaryName} aria-label="Copy .verse name" className="grid size-11 place-items-center rounded-full bg-white/[.06] text-white/60 disabled:opacity-30"><Copy className="size-4" /></button>
          </div>
          <div className="mt-5 h-px bg-white/[.06]" />
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/[.045] p-4"><p className="text-xl font-extrabold">{account.profile?.domains.length ?? 0}</p><p className="mt-1 text-xs text-white/40">Owned names</p></div>
            <div className="rounded-2xl bg-white/[.045] p-4"><p className="text-xl font-extrabold">{linkedIdentities.length}</p><p className="mt-1 text-xs text-white/40">Verified aliases</p></div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-white/[.08] bg-[#13151f]/82 px-5 sm:px-7">
          <h2 className="pt-6 text-lg font-extrabold">Linked identities</h2>
          {linkedIdentities.map((identity) => {
            const Icon = identity.provider === "email" ? Mail : identity.provider === "x" ? AtSign : Send;
            const label = identity.provider === "email" ? "Recovery email" : identity.provider === "x" ? "X username" : identity.provider === "telegram" ? "Telegram" : ".verse name";
            return <div key={`${identity.provider}-${identity.handle}`} className="flex w-full items-center gap-4 border-b border-white/[.06] py-4 text-left last:border-0">
              <span className="grid size-10 place-items-center rounded-full bg-white/[.055]"><Icon className="size-4.5 text-white/65" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block truncate text-xs text-white/38">{identity.handle}</span></span>
              <span className="text-xs font-bold text-emerald-400">Verified</span>
            </div>;
          })}
          {account.authenticated && linkedIdentities.length === 0 && <p className="py-8 text-center text-sm text-white/40">No verified identities yet.</p>}
        </section>

        <Link href="/signup" className="mt-5 flex items-center gap-4 rounded-[26px] border border-white/[.08] bg-[#13151f]/72 p-5">
          <span className="grid size-11 place-items-center rounded-full bg-emerald-500/10"><ShieldCheck className="size-5 text-emerald-400" /></span>
          <span className="flex-1"><span className="block text-sm font-extrabold">Account and recovery</span><span className="mt-1 block text-xs text-white/38">Email access and connected identities</span></span>
          <ChevronRight className="size-4 text-white/25" />
        </Link>
        {account.authenticated && <button type="button" onClick={() => void account.logout()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[22px] border border-white/[.08] bg-white/[.035] px-5 py-4 text-sm font-extrabold text-white/70"><LogOut className="size-4" /> Sign out</button>}
      </main>
    </VersePageShell>
  );
}
