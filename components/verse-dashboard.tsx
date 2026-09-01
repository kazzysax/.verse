"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Home,
  Plus,
  QrCode,
  Moon,
  ScanLine,
  Search,
  Send,
  Sun,
  UserRound,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { VerseLogo } from "@/components/verse-logo";
import { friendlyApiError, verseApi } from "@/lib/client/verse-api";

type Asset = "USDC" | "VERSE";
type SendStep = "details" | "review" | "sending" | "success";

const contacts = [
  { name: "Maya", handle: "maya.verse", initials: "MC", tone: "from-fuchsia-500 to-violet-600" },
  { name: "Tobi", handle: "@tobiweb3", initials: "TA", tone: "from-cyan-400 to-blue-600" },
  { name: "Amina", handle: "@aminab", initials: "AB", tone: "from-amber-400 to-rose-500" },
  { name: "Luis", handle: "luis.verse", initials: "LP", tone: "from-emerald-400 to-cyan-600" },
];

const transactions = [
  { name: "Maya Chen", handle: "maya.verse", asset: "USDC", amount: "-120.00", fiat: "$120.00", when: "Today, 10:42", incoming: false, initials: "MC", tone: "from-fuchsia-500 to-violet-600" },
  { name: "Amina Bello", handle: "@aminab", asset: "VERSE", amount: "+4,850", fiat: "$34.92", when: "Yesterday, 18:05", incoming: true, initials: "AB", tone: "from-amber-400 to-rose-500" },
  { name: "Tobi A.", handle: "@tobiweb3", asset: "USDC", amount: "-42.50", fiat: "$42.50", when: "Aug 28, 09:16", incoming: false, initials: "TA", tone: "from-cyan-400 to-blue-600" },
];

function InitialAvatar({
  initials,
  tone,
  className,
}: {
  initials: string;
  tone: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-11 ring-2 ring-background", className)}>
      <AvatarFallback className={cn("bg-gradient-to-br font-bold text-white", tone)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function Action({
  icon: Icon,
  label,
  children,
}: {
  icon?: typeof Send;
  label: string;
  children?: React.ReactNode;
}) {
  if (children) return children;
  if (!Icon) return null;
  return (
    <button type="button" className="group flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] bg-white px-3 py-4 text-[#101117] transition duration-200 hover:-translate-y-1">
      <Icon className="mb-1 size-5" />
      <span className="text-sm font-extrabold">{label}</span>
    </button>
  );
}

type PaymentQuote = {
  recipient: { provider: "verse" | "x" | "telegram"; handle: string };
  asset: Asset;
  amount: string;
  sponsored: boolean;
  executionEnabled: boolean;
};

export function SendFlow({
  authenticated = false,
  onSignIn,
  getAccessToken,
}: {
  authenticated?: boolean;
  onSignIn?: () => void;
  getAccessToken?: () => Promise<string | null>;
}) {
  const [step, setStep] = useState<SendStep>("details");
  const [asset, setAsset] = useState<Asset>("USDC");
  const [recipient, setRecipient] = useState("maya.verse");
  const [amount, setAmount] = useState("120");
  const [note, setNote] = useState("Dinner");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("details");
    setAsset("USDC");
    setRecipient("maya.verse");
    setAmount("120");
    setNote("Dinner");
    setQuote(null);
    setError("");
  };

  const advance = async () => {
    setError("");
    if (!authenticated || !getAccessToken) {
      onSignIn?.();
      return;
    }
    if (step === "details") {
      try {
        const result = await verseApi<PaymentQuote>("/api/payments/quote", getAccessToken, {
          method: "POST",
          body: JSON.stringify({ recipient, asset, amount }),
        });
        setQuote(result);
        setStep("review");
      } catch (requestError) {
        setError(friendlyApiError(requestError));
      }
    }
    if (step === "review") {
      if (!quote?.executionEnabled) {
        setError("Live payments are locked until the wallet policy and mainnet activation settings are complete.");
        return;
      }
      setStep("sending");
      try {
        await verseApi<{ payment: { id: string; status: string } }>("/api/payments", getAccessToken, {
          method: "POST",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({ recipient, asset, amount }),
        });
        setStep("success");
      } catch (requestError) {
        setStep("review");
        setError(friendlyApiError(requestError));
      }
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && window.setTimeout(reset, 180)}>
      <DialogTrigger asChild>
        <button type="button" className="group flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] bg-white px-3 py-4 text-[#101117] transition duration-200 hover:-translate-y-1">
          <ArrowUpRight className="mb-1 size-5" />
          <span className="text-sm font-extrabold">Send</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[30px] border-white/10 bg-[#101116] p-0 text-white shadow-[0_36px_120px_rgba(0,0,0,.7)] sm:max-w-[460px]">
        <div className="p-6 sm:p-7">
          {step === "details" && (
            <DialogHeader>
              <div className="mb-2 flex items-center justify-between pr-8">
                <Badge variant="outline" className="border-primary/20 bg-primary/8 text-primary">
                  Gasless on Polygon
                </Badge>
                <span className="text-xs text-muted-foreground">
                  1 of 2
                </span>
              </div>
              <DialogTitle className="text-2xl tracking-[-0.04em]">
                Send money
              </DialogTitle>
              <DialogDescription>
                Enter an exact .verse, X, or Telegram username.
              </DialogDescription>
            </DialogHeader>
          )}

          {step === "details" && (
            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Recipient
                </span>
                <div className="flex items-center gap-3 rounded-2xl border bg-background/60 px-4 py-3 focus-within:ring-2 focus-within:ring-ring/50">
                  <Search className="size-4 text-muted-foreground" />
                  <input
                    value={recipient}
                    onChange={(event) => setRecipient(event.target.value)}
                    aria-label="Recipient"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                  />
                  <CheckCircle2 className="size-4 text-emerald-500" />
                </div>
              </label>
              <div className="flex items-center gap-3 rounded-2xl border bg-accent/55 p-3 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" /> Exact-name search only. The recipient is verified before approval.
              </div>
              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Amount
                </span>
                <div className="rounded-[22px] border bg-background/60 p-4">
                  <div className="flex items-center gap-2">
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      aria-label="Amount"
                      className="min-w-0 flex-1 bg-transparent text-4xl font-extrabold tracking-[-0.06em] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setAsset(asset === "USDC" ? "VERSE" : "USDC")}
                      className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-bold"
                    >
                      <span className={cn("size-2.5 rounded-full", asset === "USDC" ? "bg-blue-500" : "verse-gradient")} />
                      {asset}
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Balance is checked before the payment is submitted.
                  </p>
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Note <span className="normal-case tracking-normal text-white/30">(optional)</span>
                </span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What is this payment for?"
                  className="h-12 w-full rounded-2xl border bg-white/[.035] px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
              <Button onClick={advance} className="verse-gradient h-12 w-full rounded-2xl border-0 text-base font-bold">
                {authenticated ? "Continue" : "Sign in to continue"}
              </Button>
              {error && <p role="alert" className="rounded-2xl bg-rose-500/10 p-3 text-center text-xs font-semibold text-rose-300">{error}</p>}
            </div>
          )}

          {step === "review" && (
            <div className="pt-2">
              <div className="flex items-center gap-3 border-b border-white/[.07] pb-5 pr-7">
                <InitialAvatar initials="MC" tone="from-fuchsia-500 to-violet-600" className="size-12 ring-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-extrabold">{quote?.recipient.handle ?? recipient}</p>
                    <span className="grid size-4 place-items-center rounded-full verse-gradient">
                      <Check className="size-2.5 stroke-[3] text-white" />
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/40">{quote?.recipient.provider ?? "identity"} · verified</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  aria-label="Change recipient"
                  className="grid size-10 place-items-center rounded-full bg-white/[.055] text-white/65 transition hover:bg-white/[.1]"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>

              <div className="px-1 py-9 text-center">
                <p className="text-4xl font-extrabold tracking-[-0.06em] sm:text-5xl">
                  {amount} {asset}
                </p>
                <p className="mt-2 text-sm font-semibold text-white/35">
                  {asset === "USDC" ? `≈ $${Number(amount || 0).toFixed(2)}` : "VERSE token payment"}
                </p>
                <button
                  type="button"
                  onClick={() => setAsset(asset === "USDC" ? "VERSE" : "USDC")}
                  className="mx-auto mt-5 inline-flex min-w-32 items-center gap-2 rounded-full bg-white/[.065] px-4 py-2.5 text-sm font-extrabold transition hover:bg-white/[.11]"
                >
                  <span className={cn("size-3 rounded-full", asset === "USDC" ? "bg-[#2775ca]" : "verse-gradient")} />
                  <span className="flex-1 text-left">{asset}</span>
                  <ChevronDown className="size-4 text-white/45" />
                </button>
              </div>

              <div className="divide-y divide-white/[.065] border-y border-white/[.065] text-sm">
                <div className="flex items-center justify-between gap-4 py-4">
                  <span className="text-white/40">Balance</span>
                  <span className="font-bold">Checked at submission</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <span className="text-white/40">Note</span>
                  <span className="max-w-[65%] truncate font-bold">{note || "No note"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <span className="text-white/40">Network fee</span>
                  <span className="font-bold text-emerald-400">$0 · sponsored</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button onClick={() => setStep("details")} className="h-13 rounded-2xl border-0 bg-white text-base font-extrabold text-[#111218] hover:bg-white/90">
                  Back
                </Button>
                <Button onClick={advance} className="verse-gradient h-13 rounded-2xl border-0 text-base font-extrabold text-white">
                  Pay
                </Button>
              </div>
              {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-center text-xs font-semibold text-rose-300">{error}</p>}
            </div>
          )}

          {step === "sending" && (
            <div className="grid min-h-[330px] place-items-center text-center">
              <div>
                <div className="verse-gradient mx-auto grid size-20 animate-pulse place-items-center rounded-full">
                  <Send className="size-8 text-white" />
                </div>
                <p className="mt-6 text-xl font-bold">Sending…</p>
                <p className="mt-2 text-sm text-muted-foreground">Gas is sponsored by .verse</p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="py-7 text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-500/12">
                <Check className="size-9 text-emerald-500" />
              </div>
              <DialogTitle className="mt-6 text-3xl tracking-[-0.05em]">Payment sent</DialogTitle>
              <DialogDescription className="mt-2">
                Your sponsored Polygon payment was submitted.
              </DialogDescription>
              <p className="mt-7 text-4xl font-extrabold tracking-[-0.06em]">
                {amount} {asset}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">to {recipient}</p>
              <Button variant="outline" className="mt-7 h-11 w-full rounded-2xl">
                <ExternalLink className="size-4" /> View transaction
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReceiveFlow({ username = "kingsley.verse" }: { username?: string }) {
  const [copied, setCopied] = useState(false);
  const copyName = async () => {
    await navigator.clipboard?.writeText(username);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] bg-white px-3 py-4 text-[#101117] transition duration-200 hover:-translate-y-1">
          <ArrowDownLeft className="mb-1 size-5" />
          <span className="text-sm font-extrabold">Receive</span>
        </button>
      </DialogTrigger>
      <DialogContent className="glass-surface rounded-[28px] sm:max-w-[420px]">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-2xl">Receive money</DialogTitle>
          <DialogDescription>Share your name or QR code.</DialogDescription>
        </DialogHeader>
        <div className="mx-auto mt-3 grid size-44 place-items-center rounded-[26px] bg-white p-5 shadow-inner">
          <QrCode className="size-full text-[#11111a]" strokeWidth={1.35} />
        </div>
        <div className="mt-3 text-center">
          <p className="text-xl font-extrabold">{username}</p>
          <p className="mt-1 text-xs text-muted-foreground">USDC + VERSE on Polygon</p>
        </div>
        <Button onClick={copyName} className="verse-gradient mt-3 h-11 rounded-2xl border-0">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy username"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function VerseDashboard() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [balanceVisible, setBalanceVisible] = useState(true);
  const total = useMemo(() => (balanceVisible ? "$1,590.00" : "••••••"), [balanceVisible]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/70 px-4 py-3 backdrop-blur-2xl sm:px-7">
        <div className="mx-auto flex max-w-[920px] items-center justify-between">
          <VerseLogo />
          <nav className="hidden items-center gap-1 rounded-full border bg-card/50 p-1 sm:flex">
            <button type="button" className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-primary">Home</button>
            <button type="button" className="rounded-full px-4 py-2 text-xs font-bold text-muted-foreground">Activity</button>
            <button type="button" className="rounded-full px-4 py-2 text-xs font-bold text-muted-foreground">Contacts</button>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/signup" className="hidden rounded-full border px-4 py-2 text-xs font-bold sm:inline-flex">
              Sign-up flow
            </Link>
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="grid size-10 place-items-center rounded-full border bg-card/60 text-muted-foreground"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <InitialAvatar initials="KO" tone="from-cyan-400 via-violet-500 to-fuchsia-500" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[920px] px-4 pb-28 pt-8 sm:px-7 sm:pt-11">
        <section className="text-center">
          <div className="relative mx-auto w-fit">
            <InitialAvatar
              initials="KO"
              tone="from-cyan-400 via-violet-500 to-fuchsia-500"
              className="size-20 text-xl shadow-[0_18px_55px_rgba(161,20,244,.28)]"
            />
            <span className="absolute bottom-0 right-0 grid size-6 place-items-center rounded-full bg-primary text-white ring-4 ring-background">
              <Check className="size-3.5 stroke-[3]" />
            </span>
          </div>
          <h1 className="verse-gradient-text mt-5 text-4xl font-extrabold tracking-[-0.065em] sm:text-5xl">
            kingsley.verse
          </h1>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="rounded-full border bg-card/55 px-3 py-1.5 text-xs font-semibold">
              <span className="mr-1.5 font-black">𝕏</span>@kingsleyx
            </span>
            <span className="rounded-full border bg-card/55 px-3 py-1.5 text-xs font-semibold">
              <Send className="mr-1.5 inline size-3 text-[#27a7e7]" />@kingsleyverse
            </span>
          </div>
        </section>

        <section className="identity-glow glass-surface relative mx-auto mt-8 max-w-[720px] overflow-hidden rounded-[32px] p-6 text-center sm:p-8">
          <div className="pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-cyan-400/12 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-12 size-64 rounded-full bg-fuchsia-500/13 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-semibold text-muted-foreground">Total balance</p>
            <button type="button" onClick={() => setBalanceVisible(!balanceVisible)} className="mt-1">
              <span className="text-4xl font-extrabold tracking-[-0.065em] sm:text-5xl">{total}</span>
            </button>
            <div className="mt-5 flex justify-center gap-2">
              <span className="rounded-full border bg-background/45 px-3 py-1.5 text-xs font-bold">
                1,274.50 USDC
              </span>
              <span className="rounded-full border bg-background/45 px-3 py-1.5 text-xs font-bold">
                43,820 VERSE
              </span>
            </div>
            <div className="mx-auto mt-7 flex max-w-sm justify-center gap-3">
              <SendFlow />
              <ReceiveFlow />
              <Action icon={Plus} label="Add" />
              <Action icon={ScanLine} label="Scan" />
            </div>
          </div>
        </section>

        <section className="glass-surface mx-auto mt-5 max-w-[720px] rounded-[28px] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-[-0.03em]">Transaction history</h2>
              <p className="mt-1 text-xs text-muted-foreground">Recent payments</p>
            </div>
            <button type="button" className="text-xs font-bold text-primary">View all</button>
          </div>
          <div className="mt-4 divide-y">
            {transactions.map((transaction) => (
              <button
                key={transaction.name + transaction.when}
                type="button"
                className="flex w-full items-center gap-3 py-4 text-left"
              >
                <InitialAvatar initials={transaction.initials} tone={transaction.tone} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{transaction.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {transaction.handle} · {transaction.when}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-extrabold", transaction.incoming && "text-emerald-500")}>
                    {transaction.amount} {transaction.asset}
                  </p>
                  <p className="text-xs text-muted-foreground">{transaction.fiat}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-surface mx-auto mt-5 max-w-[720px] rounded-[28px] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-[-0.03em]">Favourites</h2>
              <p className="mt-1 text-xs text-muted-foreground">People you pay often</p>
            </div>
            <button type="button" className="text-xs font-bold text-primary">Manage</button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {contacts.map((contact) => (
              <button
                key={contact.handle}
                type="button"
                className="group min-w-0 rounded-2xl p-2 text-center transition hover:bg-accent"
              >
                <InitialAvatar initials={contact.initials} tone={contact.tone} className="mx-auto" />
                <p className="mt-2 truncate text-xs font-bold">{contact.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{contact.handle}</p>
              </button>
            ))}
          </div>
        </section>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-[24px] border bg-background/84 px-2 py-2 shadow-2xl backdrop-blur-2xl sm:hidden">
        {[
          [Home, "Home", true],
          [Clock3, "Activity", false],
          [Users, "Contacts", false],
          [UserRound, "Profile", false],
        ].map(([Icon, label, active]) => {
          const NavIcon = Icon as typeof Home;
          return (
            <button
              key={label as string}
              type="button"
              className={cn(
                "flex min-w-16 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-bold",
                active ? "bg-accent text-primary" : "text-muted-foreground"
              )}
            >
              <NavIcon className="size-4.5" />
              {label as string}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
