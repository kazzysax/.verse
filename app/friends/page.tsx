"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Search, Star } from "lucide-react";
import { VersePageShell } from "@/components/verse-page-shell";
import { useVerseAccount } from "@/components/use-verse-account";
import { SendFlow } from "@/components/verse-dashboard";

export default function FriendsPage() {
  const account = useVerseAccount();
  const [query, setQuery] = useState("");
  const friends = useMemo(() => account.contacts.map((contact) => {
    const handle = contact.handles.find((item) => item.provider === "verse")?.handle ?? contact.handles[0]?.handle ?? "Verified contact";
    const secondary = contact.handles.find((item) => item.handle !== handle)?.handle ?? "";
    const name = contact.alias || handle.replace(".verse", "").replace("@", "");
    return {
      id: contact.id,
      name,
      handle,
      alias: secondary,
      initials: name.slice(0, 2).toUpperCase(),
      tone: "from-cyan-400 via-violet-500 to-fuchsia-500",
      favorite: contact.favorite,
    };
  }), [account.contacts]);
  const visible = useMemo(() => friends.filter((friend) => `${friend.name} ${friend.handle} ${friend.alias}`.toLowerCase().includes(query.toLowerCase())), [friends, query]);

  return (
    <VersePageShell>
      <main className="relative z-10 mx-auto max-w-[740px] px-4 pb-32 pt-12 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-white/45">Your people</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-[-0.06em]">Friends</h1>
        </div>

        <section className="mt-9 rounded-[30px] border border-white/[.08] bg-[#13151f]/90 p-4 shadow-[0_28px_80px_rgba(0,0,0,.35)] sm:p-6">
          <label className="flex h-13 items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.045] px-4">
            <Search className="size-5 text-white/40" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search .verse names or handles" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" />
          </label>

          <div className="mt-5 divide-y divide-white/[.06]">
            {visible.map((friend) => (
              <div key={friend.id} className="flex items-center gap-3 py-4">
                <span className={`relative grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${friend.tone} text-sm font-extrabold`}>
                  {friend.initials}
                  <span className="verse-gradient absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full ring-2 ring-[#13151f]"><Check className="size-3 stroke-[3]" /></span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate text-sm font-extrabold">{friend.name}</span>{friend.favorite && <Star className="size-3.5 fill-fuchsia-300 text-fuchsia-300" />}</span>
                  <span className="mt-0.5 block truncate text-xs text-white/38">{friend.handle} · {friend.alias}</span>
                </span>
                <SendFlow authenticated={account.authenticated} onSignIn={() => window.location.assign("/signup")} getAccessToken={account.getAccessToken} initialRecipient={friend.handle} compact />
              </div>
            ))}
            {!account.authenticated && <Link href="/signup" className="verse-gradient mx-auto my-9 block w-fit rounded-full px-6 py-3 text-sm font-extrabold">Sign in to view friends</Link>}
            {account.authenticated && !visible.length && <p className="py-10 text-center text-sm text-white/40">No friends saved yet.</p>}
          </div>
        </section>
      </main>
    </VersePageShell>
  );
}
