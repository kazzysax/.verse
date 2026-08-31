"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VerseLogo } from "@/components/verse-logo";

const steps = [
  { label: "Account", icon: UserRound, detail: "Verify X or Telegram" },
  { label: "Recovery", icon: Mail, detail: "Add a recovery email" },
  { label: "Username", icon: Sparkles, detail: "Claim your free name" },
  { label: "Wallet", icon: Wallet, detail: "Create your Privy wallet" },
];

export function VerseOnboarding() {
  const [step, setStep] = useState(0);
  const [social, setSocial] = useState<"x" | "telegram">("x");
  const [email, setEmail] = useState("kingsley@example.com");
  const [username, setUsername] = useState("kingsley");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  const next = () => {
    if (step === 2) {
      setChecking(true);
      window.setTimeout(() => {
        setChecking(false);
        setStep(3);
      }, 750);
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-7 sm:py-8">
      <div className="pointer-events-none absolute -left-44 -top-52 size-[34rem] rounded-full bg-cyan-400/15 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-56 -right-40 size-[38rem] rounded-full bg-fuchsia-500/15 blur-[110px]" />

      <header className="relative mx-auto flex max-w-[1080px] items-center justify-between">
        <VerseLogo />
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border bg-card/40 px-4 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground">
          Dashboard <ArrowRight className="size-3.5" />
        </Link>
      </header>

      <div className="relative mx-auto mt-9 grid max-w-[1000px] items-center gap-10 lg:mt-14 lg:grid-cols-[.9fr_1.1fr]">
        <section className="hidden lg:block">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">Your name is your wallet</p>
          <h1 className="mt-5 max-w-md text-5xl font-extrabold leading-[1.03] tracking-[-0.065em]">
            Send money to people, not addresses.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            Create a memorable .verse username, connect your social identity, and receive a secure wallet automatically.
          </p>
          <div className="mt-9 space-y-4">
            {steps.map(({ label, detail, icon: Icon }, index) => (
              <div key={label} className="flex items-center gap-4">
                <span className={cn(
                  "grid size-10 place-items-center rounded-full border transition",
                  index < step && "bg-emerald-500/12 text-emerald-500",
                  index === step && "verse-gradient border-transparent text-white shadow-[0_10px_30px_rgba(180,0,255,.24)]",
                  index > step && "bg-card/40 text-muted-foreground"
                )}>
                  {index < step ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                <div>
                  <p className={cn("text-sm font-bold", index !== step && "text-muted-foreground")}>{label}</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-surface mx-auto w-full max-w-[520px] rounded-[32px] p-5 sm:p-8">
          <div className="mb-7 flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">Step {step + 1} of 4</p>
            <div className="flex gap-1.5">
              {steps.map((item, index) => (
                <span key={item.label} className={cn("h-1.5 w-8 rounded-full transition", index <= step ? "verse-gradient" : "bg-muted")} />
              ))}
            </div>
          </div>

          {step === 0 && (
            <div>
              <VerseLogo showName={false} className="mx-auto w-fit [&_svg]:size-16" />
              <div className="mt-6 text-center">
                <h2 className="text-3xl font-extrabold tracking-[-0.055em]">Create your .verse account</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Choose the social account people can use to find and pay you.
                </p>
              </div>
              <div className="mt-7 space-y-3">
                <button type="button" onClick={() => setSocial("x")} className={cn(
                  "flex h-14 w-full items-center gap-4 rounded-2xl border px-4 text-left transition",
                  social === "x" ? "border-primary/40 bg-accent" : "bg-background/45 hover:border-primary/25"
                )}>
                  <span className="grid size-9 place-items-center rounded-full bg-foreground text-lg font-black text-background">𝕏</span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Continue with X</span>
                    <span className="block text-xs text-muted-foreground">Verify your X username</span>
                  </span>
                  {social === "x" && <CheckCircle2 className="size-5 text-primary" />}
                </button>
                <button type="button" onClick={() => setSocial("telegram")} className={cn(
                  "flex h-14 w-full items-center gap-4 rounded-2xl border px-4 text-left transition",
                  social === "telegram" ? "border-primary/40 bg-accent" : "bg-background/45 hover:border-primary/25"
                )}>
                  <span className="grid size-9 place-items-center rounded-full bg-[#27A7E7] text-white"><Send className="size-4" /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Continue with Telegram</span>
                    <span className="block text-xs text-muted-foreground">Verify your Telegram username</span>
                  </span>
                  {social === "telegram" && <CheckCircle2 className="size-5 text-primary" />}
                </button>
              </div>
              <Button onClick={next} className="verse-gradient mt-6 h-12 w-full rounded-2xl border-0 text-base font-bold">
                Continue <ArrowRight className="size-4" />
              </Button>
              <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
                Prototype only. Live social login will be connected through Privy.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary"><Mail className="size-7" /></span>
              <div className="mt-6 text-center">
                <h2 className="text-3xl font-extrabold tracking-[-0.055em]">Add a recovery email</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  We’ll use this only to recover your account and send payment notifications.
                </p>
              </div>
              <label className="mt-7 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Email address</span>
                <div className="flex h-14 items-center gap-3 rounded-2xl border bg-background/50 px-4 focus-within:ring-2 focus-within:ring-ring/40">
                  <Mail className="size-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
                </div>
              </label>
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-emerald-500/8 p-3 text-xs text-emerald-500">
                <CheckCircle2 className="size-4 shrink-0" /> Verification code ready for the prototype
              </div>
              <Button onClick={next} className="verse-gradient mt-6 h-12 w-full rounded-2xl border-0 text-base font-bold">Verify email</Button>
            </div>
          )}

          {step === 2 && (
            <div>
              <span className="verse-gradient mx-auto grid size-16 place-items-center rounded-full text-white"><Sparkles className="size-7" /></span>
              <div className="mt-6 text-center">
                <h2 className="text-3xl font-extrabold tracking-[-0.055em]">Claim your free name</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Your first .verse name is free, transferable, and yours for life.
                </p>
              </div>
              <label className="mt-7 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Choose a username</span>
                <div className="flex h-16 items-center rounded-2xl border bg-background/50 px-4 focus-within:ring-2 focus-within:ring-ring/40">
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="min-w-0 flex-1 bg-transparent text-xl font-extrabold outline-none"
                  />
                  <span className="text-xl font-extrabold text-muted-foreground">.verse</span>
                </div>
              </label>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-500">{checking ? "Checking availability…" : (username || "username") + ".verse is available"}</span>
                <span className="text-muted-foreground">Free</span>
              </div>
              <Button onClick={next} disabled={!username || checking} className="verse-gradient mt-6 h-12 w-full rounded-2xl border-0 text-base font-bold disabled:opacity-50">
                {checking ? "Claiming…" : "Claim " + (username || "username") + ".verse"}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="py-2 text-center">
              <div className="relative mx-auto w-fit">
                <span className="verse-gradient grid size-20 place-items-center rounded-full text-white shadow-[0_18px_55px_rgba(185,0,255,.26)]"><Check className="size-9 stroke-[3]" /></span>
                <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-background ring-1 ring-border"><Wallet className="size-4 text-primary" /></span>
              </div>
              <h2 className="mt-7 text-3xl font-extrabold tracking-[-0.055em]">You’re ready</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Your name and embedded wallet have been created.</p>
              <div className="mt-7 rounded-[24px] border bg-background/50 p-5">
                <p className="verse-gradient-text text-3xl font-extrabold tracking-[-0.055em]">{username}.verse</p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="rounded-full border px-3 py-1.5 text-xs font-bold">{social === "x" ? "𝕏 @kingsleyx" : "Telegram @kingsleyverse"}</span>
                  <span className="rounded-full border px-3 py-1.5 text-xs font-bold text-emerald-500">Verified</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-accent/55 p-3 text-left">
                <ShieldCheck className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-bold">Privy wallet created</p>
                  <p className="text-[11px] text-muted-foreground">Protected by social login and email recovery</p>
                </div>
              </div>
              <Button asChild className="verse-gradient mt-6 h-12 w-full rounded-2xl border-0 text-base font-bold">
                <Link href="/">Open dashboard <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          )}

          {step > 0 && step < 3 && (
            <button type="button" onClick={() => setStep((current) => current - 1)} className="mt-5 flex w-full items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-3.5" /> Back
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
