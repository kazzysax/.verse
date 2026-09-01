"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Clock3,
  Home,
  Plus,
  Send,
  UserRound,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { VerseLogo } from "@/components/verse-logo";
import { ReceiveFlow, SendFlow } from "@/components/verse-dashboard";
import { useVerseAuth } from "@/components/verse-auth-context";
import { friendlyApiError, verseApi, VerseApiError } from "@/lib/client/verse-api";

const transactions = [
  { name: "Maya Chen", handle: "maya.verse", asset: "USDC", amount: "-120.00", fiat: "$120.00", when: "Today · 10:42", incoming: false, initials: "MC", tone: "from-fuchsia-500 to-violet-600" },
  { name: "Amina Bello", handle: "@aminab", asset: "VERSE", amount: "+4,850", fiat: "$34.92", when: "Yesterday · 18:05", incoming: true, initials: "AB", tone: "from-amber-400 to-rose-500" },
  { name: "Tobi A.", handle: "@tobiweb3", asset: "USDC", amount: "-42.50", fiat: "$42.50", when: "Aug 28 · 09:16", incoming: false, initials: "TA", tone: "from-cyan-400 to-blue-600" },
];

const contacts = [
  { name: "Maya", handle: "maya.verse", initials: "MC", tone: "from-fuchsia-500 to-violet-600" },
  { name: "Tobi", handle: "@tobiweb3", initials: "TA", tone: "from-cyan-400 to-blue-600" },
  { name: "Amina", handle: "@aminab", initials: "AB", tone: "from-amber-400 to-rose-500" },
  { name: "Luis", handle: "luis.verse", initials: "LP", tone: "from-emerald-400 to-cyan-600" },
];

type Profile = {
  id: string;
  email: string | null;
  walletReady: boolean;
  identities: Array<{ provider: "email" | "x" | "telegram" | "verse"; handle: string; verified: boolean }>;
  domains: Array<{ name: string; status: string; primary: boolean }>;
};

type Payment = {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  recipientDisplay: string;
  asset: "USDC" | "VERSE";
  amountDisplay: string;
  status: string;
  createdAt: string;
};

type Contact = {
  id: string;
  alias: string | null;
  favorite: boolean;
  handles: Array<{ provider: string; handle: string }>;
};

function Person({
  initials,
  tone,
  className,
}: {
  initials: string;
  tone: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-11 ring-2 ring-white/10", className)}>
      <AvatarFallback className={cn("bg-gradient-to-br font-bold text-white", tone)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function VerseDashboardV2() {
  const { ready, authenticated, login, logout, getAccessToken } = useVerseAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [transactionTab, setTransactionTab] = useState<"all" | "recent">("recent");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [livePayments, setLivePayments] = useState<Payment[]>([]);
  const [liveContacts, setLiveContacts] = useState<Contact[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loadError, setLoadError] = useState("");
  const total = useMemo(
    () => (balanceVisible ? (authenticated ? "—" : "$1,590.00") : "••••••"),
    [authenticated, balanceVisible],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let active = true;
    Promise.all([
      verseApi<{ profile: Profile }>("/api/me", getAccessToken),
      verseApi<{ payments: Payment[] }>("/api/payments?limit=25", getAccessToken),
      verseApi<{ contacts: Contact[] }>("/api/contacts", getAccessToken),
      verseApi<{ notifications: Array<{ readAt: string | null }> }>("/api/notifications", getAccessToken),
    ])
      .then(([me, paymentResult, contactResult, notificationResult]) => {
        if (!active) return;
        setProfile(me.profile);
        setLivePayments(paymentResult.payments);
        setLiveContacts(contactResult.contacts);
        setUnreadNotifications(notificationResult.notifications.filter((item) => !item.readAt).length);
        setLoadError("");
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError instanceof VerseApiError && requestError.code === "ACCOUNT_NOT_BOOTSTRAPPED") {
          window.location.assign("/signup");
          return;
        }
        setLoadError(friendlyApiError(requestError));
      });
    return () => {
      active = false;
    };
  }, [authenticated, getAccessToken, ready]);

  const primaryName = profile?.domains.find((domain) => domain.primary)?.name ?? profile?.domains[0]?.name;
  const displayName = primaryName ?? (authenticated ? "Claim your .verse name" : "kingsley.verse");
  const socialIdentities = profile?.identities.filter((identity) => identity.provider === "x" || identity.provider === "telegram") ?? [];
  const displayedTransactions = authenticated
    ? livePayments.map((payment) => {
        const incoming = payment.recipientUserId === profile?.id;
        const label = incoming ? "Incoming payment" : payment.recipientDisplay;
        return {
          name: incoming ? "Received" : payment.recipientDisplay,
          handle: `${label} · ${payment.status}`,
          asset: payment.asset,
          amount: `${incoming ? "+" : "-"}${payment.amountDisplay}`,
          fiat: payment.status,
          when: new Date(payment.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          incoming,
          initials: incoming ? "IN" : payment.recipientDisplay.slice(0, 2).toUpperCase(),
          tone: incoming ? "from-emerald-400 to-cyan-600" : "from-cyan-400 to-violet-600",
        };
      })
    : transactions;
  const displayedContacts = authenticated
    ? liveContacts.filter((contact) => contact.favorite).map((contact) => {
        const handle = contact.handles.find((item) => item.provider === "verse")?.handle ?? contact.handles[0]?.handle ?? "Verified contact";
        const name = contact.alias || handle.replace(".verse", "").replace("@", "");
        return { name, handle, initials: name.slice(0, 2).toUpperCase(), tone: "from-fuchsia-500 to-violet-600" };
      })
    : contacts;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080910] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_50%_-5%,rgba(32,215,242,.32),transparent_34%),radial-gradient(circle_at_12%_7%,rgba(40,121,242,.26),transparent_32%),radial-gradient(circle_at_86%_2%,rgba(240,0,210,.22),transparent_31%),linear-gradient(180deg,rgba(56,46,145,.28),transparent_88%)]" />
      <div className="pointer-events-none absolute left-1/2 top-20 size-[540px] -translate-x-1/2 rounded-full border border-white/[.035]" />
      <div className="pointer-events-none absolute left-1/2 top-28 size-[420px] -translate-x-1/2 rounded-full border border-white/[.035]" />

      <header className="relative z-20 px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="mx-auto flex max-w-[900px] items-center justify-between">
          <VerseLogo className="text-white" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative grid size-12 place-items-center rounded-full border border-white/10 bg-white/[.08] text-white backdrop-blur-xl transition hover:bg-white/[.13]"
            >
              <Bell className="size-5" />
              {(authenticated ? unreadNotifications > 0 : true) && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-fuchsia-500 ring-2 ring-[#131526]" />}
            </button>
            {authenticated ? (
              <button type="button" onClick={() => void logout()} aria-label="Sign out" title="Sign out" className="rounded-full p-0.5 verse-gradient">
                <Person initials={(primaryName ?? profile?.email ?? "VE").slice(0, 2).toUpperCase()} tone="from-cyan-400 via-violet-500 to-fuchsia-500" className="size-11 ring-2 ring-[#11131d]" />
              </button>
            ) : (
              <Link href="/signup" className="rounded-full p-0.5 verse-gradient" aria-label="Sign in">
                <Person initials="IN" tone="from-cyan-400 via-violet-500 to-fuchsia-500" className="size-11 ring-2 ring-[#11131d]" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[900px] px-4 pb-28 pt-10 sm:px-8 sm:pt-12">
        <section className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-[-0.06em] sm:text-4xl">{displayName}</h1>
            <span className="verse-gradient grid size-5 place-items-center rounded-full"><Check className="size-3 stroke-[3]" /></span>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-white/65">
            {authenticated ? socialIdentities.map((identity, index) => (
              <span key={identity.provider}>
                {index > 0 && <span className="mr-2 text-white/25">•</span>}
                {identity.provider === "x" ? <span className="mr-1 font-black text-white">𝕏</span> : <Send className="mr-1 inline size-3 text-[#2ab6f6]" />}
                {identity.handle}
              </span>
            )) : (
              <>
                <span><span className="mr-1 font-black text-white">𝕏</span>@kingsleyx</span>
                <span className="text-white/25">•</span>
                <span><Send className="mr-1 inline size-3 text-[#2ab6f6]" />@kingsleyverse</span>
              </>
            )}
          </div>
          {loadError && <p role="alert" className="mx-auto mt-4 max-w-md rounded-xl bg-rose-500/10 px-4 py-2 text-xs text-rose-300">{loadError}</p>}
        </section>

        <section className="relative mx-auto mt-8 max-w-[720px] pt-7">
          <div className="absolute inset-x-10 top-0 h-24 rounded-[34px] border border-white/[.07] bg-gradient-to-r from-cyan-400/10 via-blue-500/10 to-fuchsia-500/10 backdrop-blur-xl" />
          <div className="absolute inset-x-5 top-3 h-24 rounded-[34px] border border-white/[.07] bg-[#161827]/80 backdrop-blur-xl" />
          <div className="relative overflow-hidden rounded-[38px] border border-white/[.08] bg-gradient-to-b from-[#1c1f2d] via-[#10121a] to-[#090a0f] px-5 pb-5 pt-8 shadow-[0_35px_100px_rgba(0,0,0,.55)] sm:px-8 sm:pb-8">
            <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 top-10 size-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="relative text-center">
              <button type="button" className="inline-flex items-center gap-2 rounded-full bg-white/[.08] px-3 py-1.5 text-xs font-bold text-white/75">
                <span className="size-2.5 rounded-full bg-blue-500" /> USDC + VERSE
              </button>
              <p className="mt-7 text-sm font-medium text-white/55">Available balance</p>
              <button type="button" onClick={() => setBalanceVisible(!balanceVisible)} className="mt-1">
                <span className="text-5xl font-extrabold tracking-[-0.07em] sm:text-6xl">{total}</span>
              </button>
              <div className="mt-4 flex justify-center gap-4 text-xs font-semibold text-white/55">
                {authenticated ? <span>Live balances activate when the Polygon RPC is configured</span> : <><span>1,274.50 USDC</span><span>43,820 VERSE</span></>}
              </div>
              <div className="mt-9 grid grid-cols-3 gap-3">
                <SendFlow authenticated={authenticated} onSignIn={() => login()} getAccessToken={getAccessToken} />
                <ReceiveFlow username={primaryName ?? "kingsley.verse"} />
                <button type="button" className="group flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] bg-white px-3 py-4 text-[#101117] transition duration-200 hover:-translate-y-1">
                  <Plus className="mb-1 size-5" />
                  <span className="text-sm font-extrabold">Add</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-[720px] overflow-hidden rounded-[30px] border border-white/[.07] bg-[#12141d]/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,.35)] sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold tracking-[-0.035em]">Transactions</h2>
            <div className="flex rounded-full bg-[#1c1f2a] p-1 text-xs font-bold">
              <button type="button" onClick={() => setTransactionTab("all")} className={cn("rounded-full px-4 py-2 transition", transactionTab === "all" ? "bg-white/[.09] text-white" : "text-white/45")}>
                View all
              </button>
              <button type="button" onClick={() => setTransactionTab("recent")} className={cn("rounded-full px-4 py-2 transition", transactionTab === "recent" ? "verse-gradient text-white" : "text-white/45")}>
                Recent
              </button>
            </div>
          </div>
          <div className="mt-5 divide-y divide-white/[.06]">
            {displayedTransactions.length ? displayedTransactions.map((transaction) => (
              <button key={transaction.name + transaction.when} type="button" className="flex w-full items-center gap-3 py-4 text-left transition hover:opacity-80">
                <Person initials={transaction.initials} tone={transaction.tone} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{transaction.name}</p>
                  <p className="mt-0.5 truncate text-xs text-white/40">{transaction.handle} · {transaction.when}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-extrabold", transaction.incoming && "text-emerald-400")}>{transaction.amount} {transaction.asset}</p>
                  <p className="mt-0.5 text-xs text-white/40">{transaction.fiat}</p>
                </div>
              </button>
            )) : <p className="py-8 text-center text-sm text-white/40">No transactions yet.</p>}
          </div>
        </section>

        <section className="mx-auto mt-5 max-w-[720px] rounded-[30px] border border-white/[.07] bg-[#12141d]/80 p-5 sm:p-7">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.03em]">Favourites</h2>
              <p className="mt-1 text-xs text-white/40">People you pay often</p>
            </div>
            <button type="button" className="text-xs font-bold text-fuchsia-300">Manage</button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {displayedContacts.length ? displayedContacts.map((contact) => (
              <button key={contact.handle} type="button" className="min-w-0 rounded-2xl p-2 text-center transition hover:bg-white/[.05]">
                <Person initials={contact.initials} tone={contact.tone} className="mx-auto" />
                <p className="mt-2 truncate text-xs font-bold">{contact.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-white/35">{contact.handle}</p>
              </button>
            )) : <p className="col-span-4 py-5 text-center text-xs text-white/40">No favourites yet.</p>}
          </div>
        </section>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-[24px] border border-white/10 bg-[#12141d]/90 px-2 py-2 shadow-2xl backdrop-blur-2xl sm:hidden">
        {[
          [Home, "Home", true],
          [Clock3, "Activity", false],
          [Users, "Contacts", false],
          [UserRound, "Profile", false],
        ].map(([Icon, label, active]) => {
          const NavIcon = Icon as typeof Home;
          return (
            <button key={label as string} type="button" className={cn("flex min-w-16 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-bold", active ? "bg-white/[.07] text-white" : "text-white/35")}>
              <NavIcon className="size-4.5" />
              {label as string}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
