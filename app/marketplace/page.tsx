"use client";

import { useState } from "react";
import { CheckCircle2, Search, Store } from "lucide-react";
import { VersePageShell } from "@/components/verse-page-shell";
import { useVerseAccount } from "@/components/use-verse-account";
import { VerseLoader } from "@/components/verse-loader";
import { friendlyApiError, verseApi } from "@/lib/client/verse-api";

type DomainQuote = {
  quoteToken: string;
  name: string;
  priceVerse: string;
  targetUsd: string;
  expiresAt: string;
};

export default function MarketplacePage() {
  const account = useVerseAccount();
  const [name, setName] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [quote, setQuote] = useState<DomainQuote | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const checkName = async () => {
    if (!account.authenticated) {
      account.login();
      return;
    }
    setBusy(true);
    setError("");
    setQuote(null);
    setStatus("");
    try {
      const result = await verseApi<{ name: string; available: boolean }>("/api/domains/check", account.getAccessToken, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setAvailable(result.available);
    } catch (requestError) {
      setAvailable(null);
      setError(friendlyApiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const getQuote = async () => {
    setBusy(true);
    setError("");
    try {
      setQuote(await verseApi<DomainQuote>("/api/domains/purchase/quote", account.getAccessToken, {
        method: "POST",
        body: JSON.stringify({ name }),
      }));
    } catch (requestError) {
      setError(friendlyApiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const purchase = async () => {
    if (!quote) return;
    setBusy(true);
    setError("");
    try {
      const result = await verseApi<{ order: { status: string } }>("/api/domains/purchase", account.getAccessToken, {
        method: "POST",
        body: JSON.stringify({ quoteToken: quote.quoteToken }),
      });
      setStatus(result.order.status);
      setQuote(null);
      await account.refresh();
    } catch (requestError) {
      setError(friendlyApiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <VersePageShell>
      <main className="relative z-10 mx-auto max-w-[760px] px-4 pb-32 pt-12 sm:px-8">
        <div className="text-center">
          <div className="verse-gradient mx-auto grid size-16 place-items-center rounded-[22px] shadow-[0_18px_55px_rgba(132,58,240,.3)]"><Store className="size-7" /></div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.06em]">Marketplace</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/45">Find and register an additional unclaimed .verse name for $1 worth of VERSE.</p>
        </div>

        <section className="mt-9 rounded-[30px] border border-white/[.08] bg-[#13151f]/88 p-5 sm:p-7">
          <label className="flex h-14 items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.045] px-4">
            <Search className="size-5 text-white/35" />
            <input value={name} onChange={(event) => { setName(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setAvailable(null); setQuote(null); }} placeholder="Search a .verse name" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-white/30" />
            <span className="font-extrabold text-white/40">.verse</span>
          </label>
          <button type="button" onClick={checkName} disabled={!name || busy} className="verse-gradient mt-4 h-12 w-full rounded-2xl text-sm font-extrabold disabled:opacity-40">
            {busy ? "Checking…" : account.authenticated ? "Check availability" : "Sign in to search"}
          </button>

          {available === false && <p className="mt-5 rounded-2xl bg-white/[.04] p-4 text-center text-sm text-white/55">{name}.verse is already registered.</p>}
          {available === true && !quote && <div className="mt-5 rounded-[24px] border border-emerald-400/15 bg-emerald-400/[.05] p-5 text-center">
            <CheckCircle2 className="mx-auto size-7 text-emerald-400" />
            <p className="mt-3 text-lg font-extrabold">{name}.verse is available</p>
            <button type="button" onClick={getQuote} disabled={busy} className="mt-4 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[#111218]">Get live VERSE price</button>
          </div>}

          {quote && <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[.04] p-5">
            <div className="flex items-center justify-between gap-4"><span className="text-white/45">Name</span><strong>{quote.name}</strong></div>
            <div className="mt-3 flex items-center justify-between gap-4"><span className="text-white/45">Price</span><strong>{Number(quote.priceVerse).toLocaleString(undefined, { maximumFractionDigits: 6 })} VERSE</strong></div>
            <div className="mt-3 flex items-center justify-between gap-4"><span className="text-white/45">USD target</span><strong>$ {quote.targetUsd}</strong></div>
            <p className="mt-4 text-xs text-white/35">Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}.</p>
            <button type="button" onClick={purchase} disabled={busy} className="verse-gradient mt-5 h-12 w-full rounded-2xl text-sm font-extrabold">Pay with VERSE and register</button>
          </div>}

          {busy && quote && <VerseLoader className="mx-auto mt-5 size-12" label="Processing domain purchase" />}
          {status && <p className="mt-5 rounded-2xl bg-emerald-500/10 p-4 text-center text-sm font-bold text-emerald-300">Domain order: {status.replaceAll("_", " ")}</p>}
          {error && <p role="alert" className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-center text-sm text-rose-300">{error}</p>}
        </section>
      </main>
    </VersePageShell>
  );
}
