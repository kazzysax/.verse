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
import { useVerseAuth } from "@/components/verse-auth-context";
import { friendlyApiError, verseApi } from "@/lib/client/verse-api";

const steps = [
  { label: "Account", icon: UserRound, detail: "Email, X, or Telegram" },
  { label: "Recovery", icon: Mail, detail: "Verify your email" },
  { label: "Username", icon: Sparkles, detail: "Claim your free name" },
  { label: "Wallet", icon: Wallet, detail: "Create your Privy wallet" },
];

export function VerseOnboarding() {
  const { ready, authenticated, user, login, linkEmail, getAccessToken } = useVerseAuth();
  const [introduced, setIntroduced] = useState(false);
  const [step, setStep] = useState(0);
  const [loginMethod, setLoginMethod] = useState<"email" | "x" | "telegram">("email");
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [claimedName, setClaimedName] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  useEffect(() => {
    if (step !== 2 || !username || !authenticated) {
      return;
    }
    const timer = window.setTimeout(async () => {
      setChecking(true);
      setError("");
      try {
        const result = await verseApi<{ name: string; available: boolean }>(
          "/api/domains/check",
          getAccessToken,
          { method: "POST", body: JSON.stringify({ name: username }) },
        );
        setAvailable(result.available);
      } catch (requestError) {
        setAvailable(null);
        setError(friendlyApiError(requestError));
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [authenticated, getAccessToken, step, username]);

  const currentStep = authenticated && step === 0 ? 1 : step;
  const verifiedEmail = user?.email?.address ?? "";

  const startAuthentication = () => {
    setError("");
    if (authenticated) {
      setStep(1);
      return;
    }
    const method = loginMethod === "x" ? "twitter" : loginMethod;
    login({ loginMethods: [method] });
  };

  const prepareAccount = async () => {
    setError("");
    const verifiedEmail = user?.email?.address;
    if (!verifiedEmail) {
      linkEmail();
      return;
    }
    setBusy(true);
    try {
      await verseApi<{ user: { walletReady: boolean } }>(
        "/api/users/bootstrap",
        getAccessToken,
        { method: "POST", body: JSON.stringify({ recoveryEmail: verifiedEmail }) },
      );
      setStep(2);
    } catch (requestError) {
      setError(friendlyApiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const claimDomain = async () => {
    if (!username || available !== true) return;
    setBusy(true);
    setError("");
    try {
      const result = await verseApi<{ domain: { name: string } }>(
        "/api/domains/claim",
        getAccessToken,
        { method: "POST", body: JSON.stringify({ name: username }) },
      );
      setClaimedName(result.domain.name);
      setStep(3);
    } catch (requestError) {
      setError(friendlyApiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  if (!introduced) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#07080e] text-white">
        <div className="absolute inset-x-0 top-0 h-[64vh] min-h-[430px] bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,.18),transparent_18%),radial-gradient(circle_at_22%_18%,rgba(32,215,242,.52),transparent_30%),radial-gradient(circle_at_74%_16%,rgba(130,58,240,.55),transparent_34%),radial-gradient(circle_at_72%_45%,rgba(240,0,210,.32),transparent_28%),linear-gradient(180deg,#244ec8_0%,#151c64_48%,#07080e_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[64vh] min-h-[430px] bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,.08)_48%,transparent_66%)] opacity-70 blur-2xl" />
        <div className="pointer-events-none absolute left-1/2 top-[16vh] h-52 w-[78vw] max-w-[620px] -translate-x-1/2 rotate-[-5deg] rounded-[42px] border border-white/15 bg-white/[.055] shadow-[0_40px_120px_rgba(35,109,255,.35)] backdrop-blur-2xl" />
        <div className="pointer-events-none absolute left-1/2 top-[20vh] flex h-48 w-[72vw] max-w-[560px] -translate-x-1/2 rotate-[4deg] items-center justify-center rounded-[42px] border border-white/15 bg-[#0d101a]/45 backdrop-blur-2xl">
          <div className="text-center">
            <p className="text-xs font-semibold text-white/60">Pay anyone with a name</p>
            <p className="verse-gradient-text mt-2 text-3xl font-extrabold tracking-[-0.06em] sm:text-5xl">maya.verse</p>
            <div className="mt-4 flex justify-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">USDC</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">VERSE</span>
            </div>
          </div>
        </div>

        <header className="relative z-20 mx-auto flex max-w-[1080px] items-center justify-between px-5 pt-6 sm:px-8 sm:pt-8">
          <VerseLogo className="text-white" />
          <Link href="/" className="text-xs font-bold text-white/65 transition hover:text-white">Sign in</Link>
        </header>

        <section className="relative z-20 mx-auto flex min-h-screen max-w-[1080px] flex-col justify-end px-5 pb-8 sm:px-8 sm:pb-12 lg:items-start">
          <div className="max-w-[560px]">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">Simple. Social. Gasless.</p>
            <h1 className="mt-4 text-5xl font-extrabold leading-[.98] tracking-[-0.07em] sm:text-6xl">
              Your money moves with <span className="verse-gradient-text">your name.</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/55 sm:text-base">
              Send USDC and VERSE to a .verse username, X handle, or Telegram username—no wallet addresses to copy.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setIntroduced(true)} className="verse-gradient h-13 min-w-52 rounded-2xl border-0 px-7 text-base font-bold">
                Get started <ArrowRight className="size-4" />
              </Button>
              <Link href="/" className="flex h-13 items-center justify-center rounded-2xl border border-white/12 px-7 text-sm font-bold text-white/75 transition hover:bg-white/[.06]">
                Preview dashboard
              </Link>
            </div>
          </div>
          <div className="mt-8 flex gap-2">
            <span className="verse-gradient h-1.5 w-10 rounded-full" />
            <span className="h-1.5 w-2 rounded-full bg-white/25" />
            <span className="h-1.5 w-2 rounded-full bg-white/25" />
          </div>
        </section>
      </main>
    );
  }

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
            Create a memorable .verse username and receive a secure wallet automatically. X and Telegram are optional aliases you can connect later.
          </p>
          <div className="mt-9 space-y-4">
            {steps.map(({ label, detail, icon: Icon }, index) => (
              <div key={label} className="flex items-center gap-4">
                <span className={cn(
                  "grid size-10 place-items-center rounded-full border transition",
                  index < currentStep && "bg-emerald-500/12 text-emerald-500",
                  index === currentStep && "verse-gradient border-transparent text-white shadow-[0_10px_30px_rgba(180,0,255,.24)]",
                  index > currentStep && "bg-card/40 text-muted-foreground"
                )}>
                  {index < currentStep ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                <div>
                  <p className={cn("text-sm font-bold", index !== currentStep && "text-muted-foreground")}>{label}</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-surface mx-auto w-full max-w-[520px] rounded-[32px] p-5 sm:p-8">
          <div className="mb-7 flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">Step {currentStep + 1} of 4</p>
            <div className="flex gap-1.5">
              {steps.map((item, index) => (
                <span key={item.label} className={cn("h-1.5 w-8 rounded-full transition", index <= currentStep ? "verse-gradient" : "bg-muted")} />
              ))}
            </div>
          </div>

          {currentStep === 0 && (
            <div>
              <VerseLogo className="mx-auto w-fit" />
              <div className="mt-6 text-center">
                <h2 className="text-3xl font-extrabold tracking-[-0.055em]">Create your .verse account</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Start with email, X, or Telegram. Social login is optional.
                </p>
              </div>
              <div className="mt-7 space-y-3">
                <button type="button" onClick={() => setLoginMethod("email")} className={cn(
                  "flex h-14 w-full items-center gap-4 rounded-2xl border px-4 text-left transition",
                  loginMethod === "email" ? "border-primary/40 bg-accent" : "bg-background/45 hover:border-primary/25"
                )}>
                  <span className="grid size-9 place-items-center rounded-full bg-white/10 text-foreground"><Mail className="size-4" /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Continue with email</span>
                    <span className="block text-xs text-muted-foreground">No social account required</span>
                  </span>
                  {loginMethod === "email" && <CheckCircle2 className="size-5 text-primary" />}
                </button>
                <button type="button" onClick={() => setLoginMethod("x")} className={cn(
                  "flex h-14 w-full items-center gap-4 rounded-2xl border px-4 text-left transition",
                  loginMethod === "x" ? "border-primary/40 bg-accent" : "bg-background/45 hover:border-primary/25"
                )}>
                  <span className="grid size-9 place-items-center rounded-full bg-foreground text-lg font-black text-background">𝕏</span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Continue with X</span>
                    <span className="block text-xs text-muted-foreground">Verify your X username</span>
                  </span>
                  {loginMethod === "x" && <CheckCircle2 className="size-5 text-primary" />}
                </button>
                <button type="button" onClick={() => setLoginMethod("telegram")} className={cn(
                  "flex h-14 w-full items-center gap-4 rounded-2xl border px-4 text-left transition",
                  loginMethod === "telegram" ? "border-primary/40 bg-accent" : "bg-background/45 hover:border-primary/25"
                )}>
                  <span className="grid size-9 place-items-center rounded-full bg-[#27A7E7] text-white"><Send className="size-4" /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">Continue with Telegram</span>
                    <span className="block text-xs text-muted-foreground">Verify your Telegram username</span>
                  </span>
                  {loginMethod === "telegram" && <CheckCircle2 className="size-5 text-primary" />}
                </button>
              </div>
              <Button onClick={startAuthentication} disabled={!ready || busy} className="verse-gradient mt-6 h-12 w-full rounded-2xl border-0 text-base font-bold">
                {authenticated ? "Continue" : "Verify with Privy"} <ArrowRight className="size-4" />
              </Button>
              <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
                Privy creates the embedded wallet. Link X or Telegram only if you want people to pay those handles.
              </p>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary"><Mail className="size-7" /></span>
              <div className="mt-6 text-center">
                <h2 className="text-3xl font-extrabold tracking-[-0.055em]">
                  {loginMethod === "email" ? "Verify your email" : "Add a recovery email"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {loginMethod === "email"
                    ? "This email signs you in, recovers your account, and receives payment notifications."
                    : "We’ll use this only to recover your account and send payment notifications."}
                </p>
              </div>
              <label className="mt-7 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Email address</span>
                <div className="flex h-14 items-center gap-3 rounded-2xl border bg-background/50 px-4 focus-within:ring-2 focus-within:ring-ring/40">
                  <Mail className="size-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={verifiedEmail}
                    readOnly
                    placeholder="Link a verified email with Privy"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </label>
              <div className={cn("mt-3 flex items-center gap-3 rounded-2xl p-3 text-xs", user?.email?.address ? "bg-emerald-500/8 text-emerald-500" : "bg-accent/55 text-muted-foreground")}>
                <CheckCircle2 className="size-4 shrink-0" />
                {user?.email?.address ? "Email verified by Privy" : "A verified recovery email is required before wallet setup"}
              </div>
              <Button onClick={prepareAccount} disabled={busy} className="verse-gradient mt-6 h-12 w-full rounded-2xl border-0 text-base font-bold">
                {busy ? "Preparing account…" : user?.email?.address ? "Create secure wallet" : "Link recovery email"}
              </Button>
            </div>
          )}

          {currentStep === 2 && (
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
                    onChange={(event) => {
                      setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                      setAvailable(null);
                    }}
                    className="min-w-0 flex-1 bg-transparent text-xl font-extrabold outline-none"
                  />
                  <span className="text-xl font-extrabold text-muted-foreground">.verse</span>
                </div>
              </label>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={cn("font-semibold", available === false ? "text-rose-400" : "text-emerald-500")}>
                  {checking
                    ? "Checking availability…"
                    : !username
                      ? "Enter a name"
                      : available === true
                        ? `${username}.verse is available`
                        : available === false
                          ? `${username}.verse is already taken`
                          : "Availability not checked"}
                </span>
                <span className="text-muted-foreground">Free</span>
              </div>
              <Button onClick={claimDomain} disabled={!username || checking || available !== true || busy} className="verse-gradient mt-6 h-12 w-full rounded-2xl border-0 text-base font-bold disabled:opacity-50">
                {busy ? "Claiming…" : "Claim " + (username || "username") + ".verse"}
              </Button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="py-2 text-center">
              <div className="relative mx-auto w-fit">
                <span className="verse-gradient grid size-20 place-items-center rounded-full text-white shadow-[0_18px_55px_rgba(185,0,255,.26)]"><Check className="size-9 stroke-[3]" /></span>
                <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-background ring-1 ring-border"><Wallet className="size-4 text-primary" /></span>
              </div>
              <h2 className="mt-7 text-3xl font-extrabold tracking-[-0.055em]">You’re ready</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Your name and embedded wallet have been created.</p>
              <div className="mt-7 rounded-[24px] border bg-background/50 p-5">
                <p className="verse-gradient-text text-3xl font-extrabold tracking-[-0.055em]">{claimedName || `${username}.verse`}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="rounded-full border px-3 py-1.5 text-xs font-bold">
                    {loginMethod === "email"
                      ? verifiedEmail
                      : loginMethod === "x"
                        ? `𝕏 @${user?.twitter?.username ?? "linked"}`
                        : `Telegram @${user?.telegram?.username ?? "linked"}`}
                  </span>
                  <span className="rounded-full border px-3 py-1.5 text-xs font-bold text-emerald-500">Verified</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-accent/55 p-3 text-left">
                <ShieldCheck className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-bold">Privy wallet secured</p>
                  <p className="text-[11px] text-muted-foreground">Protected by the server wallet policy and verified email recovery</p>
                </div>
              </div>
              <Button asChild className="verse-gradient mt-6 h-12 w-full rounded-2xl border-0 text-base font-bold">
                <Link href="/">Open dashboard <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          )}

          {currentStep > 0 && currentStep < 3 && (
            <button type="button" onClick={() => setStep((current) => current - 1)} className="mt-5 flex w-full items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-3.5" /> Back
            </button>
          )}
          {error && (
            <div role="alert" className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/8 p-3 text-center text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
