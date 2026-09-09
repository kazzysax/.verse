"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function InstallVerse({ variant = "header" }: { variant?: "header" | "card" }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const key = "verse-installed";
    const remember = (value: boolean) => {
      try { if (value) localStorage.setItem(key, "yes"); else localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
    };
    const standalone = window.matchMedia("(display-mode: standalone)");
    const update = () => {
      const runningAsApp = standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      if (runningAsApp) remember(true);
      let remembered = false;
      try { remembered = localStorage.getItem(key) === "yes"; } catch { /* Use current display mode. */ }
      setInstalled(runningAsApp || remembered);
      setChecked(true);
    };
    const capture = (event: Event) => {
      event.preventDefault();
      // A fresh install offer supersedes our remembered state after removal.
      remember(false);
      setInstalled(false);
      setPrompt(event as InstallPrompt);
    };
    const complete = () => { remember(true); setInstalled(true); setPrompt(null); setHelp(false); };
    update();
    standalone.addEventListener("change", update);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    window.addEventListener("storage", update);
    return () => {
      standalone.removeEventListener("change", update);
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
      window.removeEventListener("storage", update);
    };
  }, []);
  async function install() {
    if (!prompt) { setHelp(true); return; }
    setBusy(true);
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { setHelp(true); }
    finally { setPrompt(null); setBusy(false); }
  }
  if (!checked || installed) return null;
  return <>
    <div className={variant === "card" ? "relative mt-7 overflow-hidden rounded-[28px] border border-violet-400/25 bg-gradient-to-br from-cyan-500/10 via-violet-500/15 to-fuchsia-500/10 px-6 py-8 text-center" : ""}>
    {variant === "card" && <>
      <img src="/verse-home-192.png" width={80} height={80} alt=".verse app" className="mx-auto mb-5 rounded-[22px] shadow-[0_12px_40px_rgba(125,70,255,.3)]" />
      <h3 className="text-2xl font-extrabold tracking-tight">Your .verse, one tap away.</h3>
      <p className="mx-auto mb-5 mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Add .verse to your home screen for a quick way back to your wallet, friends, and payments.</p>
    </>}
    <Button type="button" onClick={() => void install()} disabled={busy} variant="outline" className={variant === "card" ? "verse-gradient h-12 w-full rounded-2xl border-0 px-5 text-base font-bold text-white" : "h-10 rounded-full border-white/20 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10 sm:px-4 sm:text-sm"}>
      <Download className="mr-2 size-4" />{busy ? "Opening install…" : "Add to home screen"}
    </Button>
    {variant === "card" && <p className="mt-3 text-xs text-muted-foreground">No app store needed. Your account stays the same.</p>}
    </div>
    <Dialog open={help} onOpenChange={setHelp}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add .verse to your home screen</DialogTitle>
          <DialogDescription>Open .verse directly from your phone, like an app.</DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-6"><strong>Android:</strong> Open your browser menu (⋮), then choose “Install app” or “Add to home screen”.</p>
        <p className="text-sm leading-6"><strong>iPhone or iPad:</strong> Open this page in Safari, tap Share, then “Add to Home Screen”.</p>
        <p className="text-sm leading-6">If you opened this page inside another app, open it in Chrome or Safari first.</p>
      </DialogContent>
    </Dialog>
  </>;
}
