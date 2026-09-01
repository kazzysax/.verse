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

export function SendFlow() {
  const [step, setStep] = useState<SendStep>("details");
  const [asset, setAsset] = useState<Asset>("USDC");
  const [recipient, setRecipient] = useState("maya.verse");
  const [amount, setAmount] = useState("120");

  const reset = () => {
    setStep("details");
    setAsset("USDC");
    setRecipient("maya.verse");
    setAmount("120");
  };

  const advance = () => {
    if (step === "details") setStep("review");
    if (step === "review") {
      setStep("sending");
      window.setTimeout(() => setStep("success"), 1100);
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
      <DialogContent className="glass-surface max-h-[92vh] overflow-y-auto rounded-[28px] p-0 sm:max-w-[460px]">
        <div className="p-6 sm:p-7">
          {step !== "success" && (
            <DialogHeader>
              <div className="mb-2 flex items-center justify-between pr-8">
                <Badge variant="outline" className="border-primary/20 bg-primary/8 text-primary">
                  Demo on Polygon Amoy
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {step === "review" ? "2 of 2" : "1 of 2"}
                </span>
              </div>
              <DialogTitle className="text-2xl tracking-[-0.04em]">
                {step === "details"
                  ? "Send money"
                  : step === "review"
                    ? "Review payment"
                    : "Sending payment"}
              </DialogTitle>
              <DialogDescription>
                {step === "details"
                  ? "Enter an exact .verse, X, or Telegram username."
                  : step === "review"
                    ? "Confirm the verified recipient before you send."
                    : "Your gasless payment is being confirmed."}
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
              <div className="flex items-center gap-3 rounded-2xl border bg-accent/55 p-3">
                <InitialAvatar initials="MC" tone="from-fuchsia-500 to-violet-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">Maya Chen</p>
                  <p className="truncate text-xs text-muted-foreground">maya.verse · @mayac</p>
                </div>
                <Badge className="bg-emerald-500/12 text-emerald-500">
                  <Check className="size-3" /> Verified
                </Badge>
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
                    {asset === "USDC" ? "≈ $120.00 · 1,274.50 available" : "≈ $0.86 · 43,820 available"}
                  </p>
                </div>
              </div>
              <Button onClick={advance} className="verse-gradient h-12 w-full rounded-2xl border-0 text-base font-bold">
                Continue
              </Button>
            </div>
          )}

          {step === "review" && (
            <div className="mt-6 space-y-5">
              <div className="rounded-[24px] border bg-background/60 p-6 text-center">
                <InitialAvatar initials="MC" tone="from-fuchsia-500 to-violet-600" className="mx-auto size-14" />
                <p className="mt-3 text-sm font-bold">Maya Chen</p>
                <p className="text-xs text-muted-foreground">{recipient} · verified</p>
                <p className="mt-6 text-4xl font-extrabold tracking-[-0.06em]">
                  {amount} {asset}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Network fee · $0</p>
              </div>
              <Button onClick={advance} className="verse-gradient h-12 w-full rounded-2xl border-0 text-base font-bold">
                Confirm and send
              </Button>
              <Button onClick={() => setStep("details")} variant="ghost" className="w-full rounded-2xl">
                Back
              </Button>
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
                Demo complete. No real funds moved.
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

export function ReceiveFlow() {
  const [copied, setCopied] = useState(false);
  const copyName = async () => {
    await navigator.clipboard?.writeText("kingsley.verse");
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
          <p className="text-xl font-extrabold">kingsley.verse</p>
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
