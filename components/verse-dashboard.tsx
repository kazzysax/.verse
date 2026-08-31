"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Heart,
  Home,
  Link2,
  Menu,
  Moon,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  Users,
  WalletCards,
  X,
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Asset = "USDC" | "VERSE";
type SendStep = "details" | "review" | "sending" | "success";

const contacts = [
  { name: "Maya Chen", handle: "maya.verse", initials: "MC", tone: "from-fuchsia-500 to-violet-600" },
  { name: "Tobi A.", handle: "@tobiweb3", initials: "TA", tone: "from-cyan-400 to-blue-600" },
  { name: "Amina Bello", handle: "@aminab", initials: "AB", tone: "from-amber-400 to-rose-500" },
  { name: "Luis Park", handle: "luis.verse", initials: "LP", tone: "from-emerald-400 to-cyan-600" },
];

const transactions = [
  { name: "Maya Chen", handle: "maya.verse", asset: "USDC", amount: "-120.00", fiat: "$120.00", when: "Today, 10:42", incoming: false, initials: "MC", tone: "from-fuchsia-500 to-violet-600" },
  { name: "Amina Bello", handle: "@aminab", asset: "VERSE", amount: "+4,850", fiat: "$34.92", when: "Yesterday, 18:05", incoming: true, initials: "AB", tone: "from-amber-400 to-rose-500" },
  { name: "Tobi A.", handle: "@tobiweb3", asset: "USDC", amount: "-42.50", fiat: "$42.50", when: "Aug 28, 09:16", incoming: false, initials: "TA", tone: "from-cyan-400 to-blue-600" },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="verse-gradient grid size-9 place-items-center rounded-[13px] shadow-[0_10px_30px_rgba(111,76,255,.28)]">
        <Sparkles className="size-4 text-white" />
      </span>
      {!compact && <span className="text-xl font-extrabold tracking-[-0.04em]">.verse</span>}
    </div>
  );
}

function InitialAvatar({
  initials,
  tone,
  size = "default",
}: {
  initials: string;
  tone: string;
  size?: "default" | "lg";
}) {
  return (
    <Avatar size={size} className="ring-2 ring-background">
      <AvatarFallback className={cn("bg-gradient-to-br font-bold text-white", tone)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full border bg-card/70 text-muted-foreground transition hover:-translate-y-0.5 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

function Action({
  icon: Icon,
  label,
  primary,
  onClick,
}: {
  icon: typeof Send;
  label: string;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
      <span
        className={cn(
          "grid size-12 place-items-center rounded-2xl border transition duration-200 group-hover:-translate-y-1",
          primary
            ? "verse-gradient border-transparent text-white shadow-[0_12px_35px_rgba(89,94,255,.32)]"
            : "bg-background/70 text-foreground"
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function SendFlow() {
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
      window.setTimeout(() => setStep("success"), 1250);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && window.setTimeout(reset, 180)}>
      <DialogTrigger asChild>
        <button type="button" className="group flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className="verse-gradient grid size-12 place-items-center rounded-2xl text-white shadow-[0_12px_35px_rgba(89,94,255,.32)] transition duration-200 group-hover:-translate-y-1">
            <Send className="size-5" />
          </span>
          <span className="text-xs font-semibold">Send</span>
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
                <span className="text-xs text-muted-foreground">{step === "review" ? "2 of 2" : "1 of 2"}</span>
              </div>
              <DialogTitle className="text-2xl tracking-[-0.04em]">
                {step === "details" ? "Send to anyone" : step === "review" ? "Review payment" : "Sending payment"}
              </DialogTitle>
              <DialogDescription>
                {step === "details"
                  ? "Use an exact .verse name, X handle or Telegram handle."
                  : step === "review"
                    ? "Confirm the verified recipient before you send."
                    : "Your sponsored transaction is being confirmed."}
              </DialogDescription>
            </DialogHeader>
          )}

          {step === "details" && (
            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Recipient</span>
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
                <InitialAvatar initials="MC" tone="from-fuchsia-500 to-violet-600" size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">Maya Chen</p>
                  <p className="truncate text-xs text-muted-foreground">maya.verse · @mayac</p>
                </div>
                <Badge className="bg-emerald-500/12 text-emerald-500"><Check className="size-3" /> Verified</Badge>
              </div>
              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Amount</span>
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
                    ≈ {asset === "USDC" ? "$120.00" : "$0.86"} · Available {asset === "USDC" ? "1,274.50" : "43,820"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><Sparkles className="size-4 text-primary" /> Network fee</span>
                <span className="font-bold text-emerald-500">$0 · Sponsored</span>
              </div>
              <Button onClick={advance} className="verse-gradient h-12 w-full rounded-2xl border-0 text-base font-bold">
                Continue
              </Button>
            </div>
          )}

          {step === "review" && (
            <div className="mt-6 space-y-5">
              <div className="rounded-[24px] border bg-background/60 p-5 text-center">
                <InitialAvatar initials="MC" tone="from-fuchsia-500 to-violet-600" size="lg" />
                <p className="mt-3 text-sm font-bold">Maya Chen</p>
                <p className="text-xs text-muted-foreground">{recipient} · verified</p>
                <p className="mt-6 text-4xl font-extrabold tracking-[-0.06em]">{amount} {asset}</p>
                <p className="mt-1 text-sm text-muted-foreground">on Polygon</p>
              </div>
              <div className="space-y-3 rounded-2xl border p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Recipient</span><span className="font-semibold">{recipient}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Network fee</span><span className="font-semibold text-emerald-500">Sponsored</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Daily allowance</span><span className="font-semibold">18 left</span></div>
              </div>
              <Button onClick={advance} className="verse-gradient h-12 w-full rounded-2xl border-0 text-base font-bold">
                Confirm and send
              </Button>
              <Button onClick={() => setStep("details")} variant="ghost" className="w-full rounded-2xl">Back</Button>
            </div>
          )}

          {step === "sending" && (
            <div className="grid min-h-[330px] place-items-center text-center">
              <div>
                <div className="verse-gradient mx-auto grid size-20 animate-pulse place-items-center rounded-[28px]">
                  <Send className="size-8 text-white" />
                </div>
                <p className="mt-6 text-xl font-bold">Signing securely…</p>
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
                Demo complete. No real funds moved in this prototype.
              </DialogDescription>
              <p className="mt-7 text-4xl font-extrabold tracking-[-0.06em]">{amount} {asset}</p>
              <p className="mt-2 text-sm text-muted-foreground">to {recipient}</p>
              <div className="mt-7 grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-11 rounded-2xl"><ExternalLink className="size-4" /> Explorer</Button>
                <Button className="verse-gradient h-11 rounded-2xl border-0"><Copy className="size-4" /> Share receipt</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VerseDashboard() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const total = useMemo(() => (balanceVisible ? "$1,590.00" : "••••••"), [balanceVisible]);

  const copyLink = async () => {
    await navigator.clipboard?.writeText("https://pay.verse/kingsley");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] border-r bg-sidebar/70 px-5 py-7 backdrop-blur-2xl lg:flex lg:flex-col">
        <BrandMark />
        <nav className="mt-10 space-y-2">
          {[
            [Home, "Home", true],
            [WalletCards, "Wallet", false],
            [Users, "Contacts", false],
            [Link2, "Payment links", false],
            [QrCode, "My QR", false],
          ].map(([Icon, label, active]) => {
            const NavIcon = Icon as typeof Home;
            return (
              <button
                key={label as string}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <NavIcon className="size-4.5" />
                {label as string}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto rounded-[22px] border bg-background/50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold"><ShieldCheck className="size-4 text-emerald-500" /> Wallet protected</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Privy security controls and email recovery.</p>
        </div>
        <button type="button" className="mt-4 flex items-center gap-3 rounded-2xl p-2 text-left hover:bg-sidebar-accent/60">
          <InitialAvatar initials="KO" tone="from-violet-500 to-cyan-500" size="lg" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">Kingsley</span>
            <span className="block text-xs text-muted-foreground">Settings</span>
          </span>
        </button>
      </aside>

      <div className="lg:pl-[232px]">
        <header className="sticky top-0 z-20 border-b bg-background/65 px-4 py-3 backdrop-blur-2xl sm:px-7 lg:px-10">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between">
            <div className="lg:hidden"><BrandMark /></div>
            <div className="hidden items-center gap-2 rounded-full border bg-card/60 px-4 py-2.5 lg:flex">
              <Search className="size-4 text-muted-foreground" />
              <span className="pr-20 text-sm text-muted-foreground">Exact .verse or social handle</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden border-emerald-500/20 bg-emerald-500/8 text-emerald-500 sm:inline-flex">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Polygon
              </Badge>
              <IconButton label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </IconButton>
              <IconButton label="Notifications"><Bell className="size-4" /></IconButton>
              <button type="button" className="lg:hidden"><InitialAvatar initials="KO" tone="from-violet-500 to-cyan-500" size="lg" /></button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 sm:px-7 lg:px-10 lg:pb-10 lg:pt-9">
          <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Welcome back, Kingsley</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="verse-gradient-text text-4xl font-extrabold tracking-[-0.065em] sm:text-5xl">kingsley.verse</h1>
                <span className="grid size-6 place-items-center rounded-full bg-primary text-white"><Check className="size-3.5 stroke-[3]" /></span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">@kingsleyx · Telegram verified · 0x71…A9c2</p>
            </div>
            <Badge variant="outline" className="w-fit border-primary/20 bg-primary/8 px-3 py-1 text-primary">
              <Sparkles className="size-3" /> Gasless payments
            </Badge>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <div className="space-y-5">
              <section className="identity-glow glass-surface relative overflow-hidden rounded-[30px] p-5 sm:p-7">
                <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full bg-cyan-400/12 blur-3xl" />
                <div className="pointer-events-none absolute -left-20 bottom-[-10rem] size-72 rounded-full bg-violet-500/18 blur-3xl" />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Total balance</p>
                      <button type="button" onClick={() => setBalanceVisible(!balanceVisible)} className="mt-1 text-left">
                        <span className="text-4xl font-extrabold tracking-[-0.065em] sm:text-5xl">{total}</span>
                      </button>
                    </div>
                    <button type="button" className="flex items-center gap-1.5 rounded-full border bg-background/45 px-3 py-2 text-xs font-bold">
                      USD <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-[20px] border bg-background/48 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><span className="size-2.5 rounded-full bg-blue-500" /> USDC</div>
                      <p className="mt-2 text-xl font-extrabold tracking-tight">1,274.50</p>
                      <p className="text-xs text-muted-foreground">$1,274.50</p>
                    </div>
                    <div className="rounded-[20px] border bg-background/48 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><span className="verse-gradient size-2.5 rounded-full" /> VERSE</div>
                      <p className="mt-2 text-xl font-extrabold tracking-tight">43,820</p>
                      <p className="text-xs text-muted-foreground">$315.50</p>
                    </div>
                  </div>
                  <div className="mx-auto mt-6 flex max-w-md justify-between">
                    <SendFlow />
                    <Action icon={ArrowDownLeft} label="Receive" />
                    <Action icon={Plus} label="Add" />
                    <Action icon={ScanLine} label="Scan" />
                  </div>
                </div>
              </section>

              <section className="glass-surface rounded-[28px] p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-[-0.03em]">Favourite people</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Verified exact-match contacts</p>
                  </div>
                  <button type="button" className="text-xs font-bold text-primary">View all</button>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {contacts.map((contact) => (
                    <button key={contact.handle} type="button" className="group min-w-0 rounded-2xl p-2 text-center transition hover:bg-accent">
                      <InitialAvatar initials={contact.initials} tone={contact.tone} size="lg" />
                      <p className="mt-2 truncate text-xs font-bold">{contact.name.split(" ")[0]}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{contact.handle}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="glass-surface rounded-[28px] p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-[-0.03em]">Recent activity</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Your latest Polygon payments</p>
                  </div>
                  <button type="button" className="text-xs font-bold text-primary">View all</button>
                </div>
                <div className="mt-4 divide-y">
                  {transactions.map((transaction) => (
                    <button key={transaction.name + transaction.when} type="button" className="flex w-full items-center gap-3 py-4 text-left">
                      <InitialAvatar initials={transaction.initials} tone={transaction.tone} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{transaction.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{transaction.handle} · {transaction.when}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-extrabold", transaction.incoming && "text-emerald-500")}>{transaction.amount} {transaction.asset}</p>
                        <p className="text-xs text-muted-foreground">{transaction.fiat}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="glass-surface rounded-[28px] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Receive instantly</p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em]">Your payment link</h2>
                  </div>
                  <QrCode className="size-5 text-primary" />
                </div>
                <div className="mt-5 rounded-[22px] border bg-background/60 p-4">
                  <div className="mx-auto grid aspect-square max-w-[176px] grid-cols-7 gap-1 rounded-xl bg-white p-4">
                    {Array.from({ length: 49 }).map((_, index) => (
                      <span
                        key={index}
                        className={cn(
                          "rounded-[2px]",
                          ((index * 7 + index * index + 3) % 5 < 2 || [0, 1, 7, 8, 5, 6, 12, 13, 35, 36, 42, 43].includes(index))
                            ? "bg-[#14131c]"
                            : "bg-transparent"
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-center text-sm font-extrabold">kingsley.verse</p>
                  <p className="mt-1 text-center text-xs text-muted-foreground">USDC + VERSE · Polygon</p>
                </div>
                <Button onClick={copyLink} variant="outline" className="mt-4 h-11 w-full rounded-2xl">
                  {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  {copied ? "Link copied" : "Copy payment link"}
                </Button>
              </section>

              <section className="glass-surface rounded-[28px] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Daily gas</p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em]">18 payments left</h2>
                  </div>
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-5" /></span>
                </div>
                <Progress value={10} className="mt-5 h-2.5 bg-primary/10 [&_[data-slot=progress-indicator]]:verse-gradient" />
                <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>2 used today</span><span>20 max</span></div>
                <p className="mt-4 rounded-2xl bg-accent/55 p-3 text-xs leading-5 text-muted-foreground">Network fees are sponsored for verified in-app payments.</p>
              </section>

              <section className="glass-surface rounded-[28px] p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500"><ShieldCheck className="size-5" /></span>
                  <div>
                    <h2 className="text-sm font-extrabold">Security healthy</h2>
                    <p className="text-xs text-muted-foreground">Social + email recovery active</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-[24px] border bg-background/82 px-2 py-2 shadow-2xl backdrop-blur-2xl lg:hidden">
        {[
          [Home, "Home", true],
          [Users, "Contacts", false],
          [CircleDollarSign, "Pay", false],
          [Clock3, "Activity", false],
          [UserRound, "Profile", false],
        ].map(([Icon, label, active]) => {
          const NavIcon = Icon as typeof Home;
          return (
            <button key={label as string} type="button" className={cn("flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold", active ? "bg-accent text-primary" : "text-muted-foreground")}>
              <NavIcon className="size-4.5" />
              {label as string}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
