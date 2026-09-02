"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import { VersePageShell } from "@/components/verse-page-shell";
import { cn } from "@/lib/utils";
import { useVerseAccount } from "@/components/use-verse-account";

type Filter = "all" | "sent" | "received";

export default function ActivityPage() {
  const account = useVerseAccount();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const activity = useMemo(() => account.payments.map((payment) => {
    const incoming = payment.recipientUserId === account.profile?.id;
    const name = incoming ? "Payment received" : payment.recipientDisplay;
    return {
      id: payment.id,
      name,
      handle: `${payment.recipientDisplay} · ${payment.status}`,
      amount: `${incoming ? "+" : "-"}${payment.amountDisplay} ${payment.asset}`,
      value: payment.txHash ? `${payment.txHash.slice(0, 8)}…${payment.txHash.slice(-6)}` : payment.status,
      date: new Date(payment.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      incoming,
      initials: name.slice(0, 2).toUpperCase(),
    };
  }), [account.payments, account.profile?.id]);
  const visible = useMemo(() => activity.filter((item) => {
    const matchesDirection = filter === "all" || (filter === "received" ? item.incoming : !item.incoming);
    const text = `${item.name} ${item.handle} ${item.amount}`.toLowerCase();
    return matchesDirection && text.includes(query.toLowerCase());
  }), [activity, filter, query]);

  return (
    <VersePageShell>
      <main className="relative z-10 mx-auto max-w-[760px] px-4 pb-32 pt-12 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-white/45">Payments</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-[-0.06em]">Activity</h1>
        </div>

        <section className="mt-9 rounded-[30px] border border-white/[.08] bg-[#13151f]/90 p-4 shadow-[0_28px_80px_rgba(0,0,0,.35)] sm:p-6">
          <label className="flex h-13 items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.045] px-4">
            <Search className="size-5 text-white/40" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names or payments" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" />
          </label>
          <div className="mt-4 grid grid-cols-3 rounded-full bg-white/[.045] p-1">
            {(["all", "sent", "received"] as Filter[]).map((item) => (
              <button key={item} type="button" onClick={() => setFilter(item)} className={cn("rounded-full px-3 py-2.5 text-xs font-extrabold capitalize transition", filter === item ? "verse-gradient text-white" : "text-white/40")}>
                {item}
              </button>
            ))}
          </div>

          <div className="mt-4 divide-y divide-white/[.06]">
            {visible.map((item) => (
              <div key={item.id} className="flex w-full items-center gap-3 py-4 text-left">
                <span className={cn("relative grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br text-sm font-extrabold", item.incoming ? "from-emerald-400 to-cyan-600" : "from-cyan-400 to-violet-600")}>
                  {item.initials}
                  <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-[#1a1c27] ring-2 ring-[#13151f]">
                    {item.incoming ? <ArrowDownLeft className="size-3 text-emerald-300" /> : <ArrowUpRight className="size-3 text-cyan-300" />}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">{item.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-white/38">{item.handle} · {item.date}</span>
                </span>
                <span className="text-right">
                  <span className={cn("block text-sm font-extrabold", item.incoming && "text-emerald-400")}>{item.amount}</span>
                  <span className="mt-0.5 block text-xs text-white/38">{item.value}</span>
                </span>
              </div>
            ))}
            {!account.authenticated && <button type="button" onClick={() => account.login()} className="verse-gradient mx-auto my-9 block rounded-full px-6 py-3 text-sm font-extrabold">Sign in to view activity</button>}
            {account.authenticated && !visible.length && <p className="py-10 text-center text-sm text-white/40">No payments yet.</p>}
          </div>
        </section>
      </main>
    </VersePageShell>
  );
}
