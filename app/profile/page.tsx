"use client";

import Link from "next/link";
import { AtSign, ChevronRight, Copy, Mail, Send, ShieldCheck } from "lucide-react";
import { VersePageShell } from "@/components/verse-page-shell";
import { useVerseAuth } from "@/components/verse-auth-context";

export default function ProfilePage() {
  const { authenticated, login } = useVerseAuth();

  return (
    <VersePageShell>
      <main className="relative z-10 mx-auto max-w-[720px] px-4 pb-32 pt-11 sm:px-8">
        <section className="text-center">
          <div className="verse-gradient mx-auto grid size-24 place-items-center rounded-full p-1 shadow-[0_22px_60px_rgba(132,58,240,.28)]">
            <div className="grid size-full place-items-center rounded-full bg-[#151722] text-2xl font-extrabold">KV</div>
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.055em]">kingsley.verse</h1>
          <p className="mt-2 text-sm text-white/45">Your payment identity</p>
          {!authenticated && <button type="button" onClick={() => login({ loginMethods: ["email"] })} className="verse-gradient mt-5 rounded-full px-6 py-3 text-sm font-extrabold">Sign in to manage profile</button>}
        </section>

        <section className="mt-9 overflow-hidden rounded-[30px] border border-white/[.08] bg-[#13151f]/90 p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">Primary name</p>
              <p className="mt-2 text-xl font-extrabold">kingsley.verse</p>
            </div>
            <button type="button" aria-label="Copy .verse name" className="grid size-11 place-items-center rounded-full bg-white/[.06] text-white/60"><Copy className="size-4" /></button>
          </div>
          <div className="mt-5 h-px bg-white/[.06]" />
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/[.045] p-4"><p className="text-xl font-extrabold">1</p><p className="mt-1 text-xs text-white/40">Owned name</p></div>
            <div className="rounded-2xl bg-white/[.045] p-4"><p className="text-xl font-extrabold">2</p><p className="mt-1 text-xs text-white/40">Payment aliases</p></div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-white/[.08] bg-[#13151f]/82 px-5 sm:px-7">
          <h2 className="pt-6 text-lg font-extrabold">Linked identities</h2>
          {[
            { icon: Mail, label: "Recovery email", value: "Verified" },
            { icon: AtSign, label: "X username", value: "@kingsleyx" },
            { icon: Send, label: "Telegram", value: "@kingsleyverse" },
          ].map(({ icon: Icon, label, value }) => (
            <button key={label} type="button" className="flex w-full items-center gap-4 border-b border-white/[.06] py-4 text-left last:border-0">
              <span className="grid size-10 place-items-center rounded-full bg-white/[.055]"><Icon className="size-4.5 text-white/65" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block truncate text-xs text-white/38">{value}</span></span>
              <ChevronRight className="size-4 text-white/25" />
            </button>
          ))}
        </section>

        <Link href="/signup" className="mt-5 flex items-center gap-4 rounded-[26px] border border-white/[.08] bg-[#13151f]/72 p-5">
          <span className="grid size-11 place-items-center rounded-full bg-emerald-500/10"><ShieldCheck className="size-5 text-emerald-400" /></span>
          <span className="flex-1"><span className="block text-sm font-extrabold">Account and recovery</span><span className="mt-1 block text-xs text-white/38">Email access and connected identities</span></span>
          <ChevronRight className="size-4 text-white/25" />
        </Link>
      </main>
    </VersePageShell>
  );
}
