"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Plus,
  Search,
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
import { VerseLoader } from "@/components/verse-loader";
import { friendlyApiError, verseApi } from "@/lib/client/verse-api";

type Asset = "USDC" | "VERSE";
type SendStep = "details" | "review" | "sending" | "success";

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

type PaymentQuote = {
  recipient: { provider: "verse" | "x" | "telegram"; handle: string };
  asset: Asset;
  amount: string;
  sponsored: boolean;
  executionEnabled: boolean;
};

type SubmittedPayment = { id: string; status: string; txHash?: string | null; chainId: number };

export function SendFlow({
  authenticated = false,
  onSignIn,
  getAccessToken,
  initialRecipient = "",
  compact = false,
}: {
  authenticated?: boolean;
  onSignIn?: () => void;
  getAccessToken?: () => Promise<string | null>;
  initialRecipient?: string;
  compact?: boolean;
}) {
  const [step, setStep] = useState<SendStep>("details");
  const [asset, setAsset] = useState<Asset>("USDC");
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [submittedPayment, setSubmittedPayment] = useState<SubmittedPayment | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("details");
    setAsset("USDC");
    setRecipient(initialRecipient);
    setAmount("");
    setNote("");
    setQuote(null);
    setSubmittedPayment(null);
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
        const result = await verseApi<{ payment: SubmittedPayment }>("/api/payments", getAccessToken, {
          method: "POST",
          headers: { "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({ recipient, asset, amount, memo: note || undefined }),
        });
        setSubmittedPayment(result.payment);
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
        <button type="button" aria-label={compact ? `Pay ${initialRecipient}` : "Send money"} className={compact ? "verse-gradient grid size-11 shrink-0 place-items-center rounded-full shadow-[0_10px_25px_rgba(132,58,240,.25)]" : "group flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] bg-white px-3 py-4 text-[#101117] transition duration-200 hover:-translate-y-1"}>
          <ArrowUpRight className={compact ? "size-4" : "mb-1 size-5"} />
          {!compact && <span className="text-sm font-extrabold">Send</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="inset-x-0 bottom-0 left-0 top-auto h-[62svh] max-h-[62svh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-[30px] border-white/10 bg-[#101116] p-0 text-white shadow-[0_-24px_90px_rgba(0,0,0,.7)] data-[state=closed]:slide-out-to-bottom-8 data-[state=open]:slide-in-from-bottom-8 sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[92vh] sm:max-w-[460px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_36px_120px_rgba(0,0,0,.7)]">
        <div aria-hidden="true" className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20 sm:hidden" />
        <div className="h-full overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 sm:h-auto sm:p-7">
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
                <InitialAvatar initials={(quote?.recipient.handle ?? recipient).slice(0, 2).toUpperCase()} tone="from-fuchsia-500 to-violet-600" className="size-12 ring-white/10" />
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
                <VerseLoader className="mx-auto size-20" label="Sending payment" />
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
              {submittedPayment?.txHash && <Button asChild variant="outline" className="mt-7 h-11 w-full rounded-2xl">
                <a href={`${submittedPayment.chainId === 80002 ? "https://amoy.polygonscan.com" : "https://polygonscan.com"}/tx/${submittedPayment.txHash}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" /> View transaction
                </a>
              </Button>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReceiveFlow({ username }: { username?: string }) {
  const [copied, setCopied] = useState(false);
  const copyName = async () => {
    if (!username) return;
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
        <div className="mt-3 text-center">
          <p className="text-xl font-extrabold">{username ?? "Claim a .verse name first"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Share this verified name to receive USDC or VERSE.</p>
        </div>
        <Button onClick={copyName} disabled={!username} className="verse-gradient mt-3 h-11 rounded-2xl border-0">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy username"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function DepositFlow({
  authenticated,
  onSignIn,
  getAccessToken,
}: {
  authenticated: boolean;
  onSignIn: () => void;
  getAccessToken: () => Promise<string | null>;
}) {
  const [deposit, setDeposit] = useState<{ walletAddress: string; chainId: number; network: string; tokens: Array<{ asset: string }> } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const open = async (isOpen: boolean) => {
    if (!isOpen || deposit) return;
    if (!authenticated) {
      onSignIn();
      return;
    }
    try {
      setDeposit(await verseApi<{ walletAddress: string; chainId: number; network: string; tokens: Array<{ asset: string }> }>("/api/deposit", getAccessToken));
    } catch (requestError) {
      setError(friendlyApiError(requestError));
    }
  };
  const copyAddress = async () => {
    if (!deposit) return;
    await navigator.clipboard?.writeText(deposit.walletAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <Dialog onOpenChange={(isOpen) => void open(isOpen)}>
      <DialogTrigger asChild>
        <button type="button" className="group flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] bg-white px-3 py-4 text-[#101117] transition duration-200 hover:-translate-y-1">
          <Plus className="mb-1 size-5" />
          <span className="text-sm font-extrabold">Add</span>
        </button>
      </DialogTrigger>
      <DialogContent className="glass-surface rounded-[28px] text-white sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add funds</DialogTitle>
          <DialogDescription>Deposit only supported tokens on the selected Polygon network.</DialogDescription>
        </DialogHeader>
        {deposit && <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-white/40">Network</p>
            <p className="mt-2 font-extrabold">{deposit.network === "mainnet" ? "Polygon PoS" : "Polygon Amoy"} · {deposit.chainId}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-white/40">Deposit address</p>
            <p className="mt-2 break-all text-sm font-semibold">{deposit.walletAddress}</p>
          </div>
          <p className="text-xs leading-5 text-amber-200/80">Sending from an external wallet is not gasless. Confirm the network and token before depositing.</p>
          <Button onClick={copyAddress} className="verse-gradient h-11 w-full rounded-2xl border-0">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy address"}</Button>
        </div>}
        {!deposit && !error && <div className="grid min-h-40 place-items-center"><VerseLoader className="size-14" label="Loading deposit details" /></div>}
        {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
