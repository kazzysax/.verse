"use client";

import { useCallback, useEffect, useState } from "react";
import { useVerseAuth } from "@/components/verse-auth-context";
import { friendlyApiError, verseApi, VerseApiError } from "@/lib/client/verse-api";

export type VerseProfile = {
  id: string;
  email: string | null;
  walletReady: boolean;
  identities: Array<{ provider: "email" | "x" | "telegram" | "verse"; handle: string; verified: boolean }>;
  domains: Array<{ name: string; status: string; primary: boolean }>;
};

export type VersePayment = {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  recipientDisplay: string;
  asset: "USDC" | "VERSE";
  amountDisplay: string;
  status: string;
  txHash?: string | null;
  chainId: number;
  createdAt: string;
};

export type VerseContact = {
  id: string;
  alias: string | null;
  favorite: boolean;
  handles: Array<{ provider: string; handle: string }>;
};

export type VerseBalances = {
  gasBalance?: { symbol: string; amount: string };
  chainId: number;
  network: "disabled" | "amoy" | "mainnet";
  balances: Record<"USDC" | "VERSE", { amount: string; decimals: number } | null>;
};

export type VerseNotification = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  readAt: string | null;
};

export function useVerseAccount() {
  const auth = useVerseAuth();
  const [profile, setProfile] = useState<VerseProfile | null>(null);
  const [payments, setPayments] = useState<VersePayment[]>([]);
  const [contacts, setContacts] = useState<VerseContact[]>([]);
  const [notifications, setNotifications] = useState<VerseNotification[]>([]);
  const [balances, setBalances] = useState<VerseBalances | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!auth.ready || !auth.authenticated) return;
    setLoading(true);
    setError("");
    try {
      await verseApi("/api/account/reconcile", auth.getAccessToken, { method: "POST" });
      const [me, paymentResult, contactResult, notificationResult] = await Promise.all([
        verseApi<{ profile: VerseProfile }>("/api/me", auth.getAccessToken),
        verseApi<{ payments: VersePayment[] }>("/api/payments?limit=100", auth.getAccessToken),
        verseApi<{ contacts: VerseContact[] }>("/api/contacts", auth.getAccessToken),
        verseApi<{ notifications: VerseNotification[] }>("/api/notifications", auth.getAccessToken),
      ]);
      setProfile(me.profile);
      setPayments(paymentResult.payments);
      setContacts(contactResult.contacts);
      setNotifications(notificationResult.notifications);
      try {
        setBalances(await verseApi<VerseBalances>("/api/balances", auth.getAccessToken));
      } catch {
        setBalances(null);
      }
    } catch (requestError) {
      if (requestError instanceof VerseApiError && requestError.code === "ACCOUNT_NOT_BOOTSTRAPPED") {
        window.location.assign("/signup");
        return;
      }
      setError(friendlyApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [auth.authenticated, auth.getAccessToken, auth.ready]);

  useEffect(() => {
    if (!auth.authenticated) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await refresh();
      if (!stopped) timer = setTimeout(poll, 15000);
    };
    timer = setTimeout(poll, 0);
    return () => { stopped = true; clearTimeout(timer); };
  }, [auth.authenticated, refresh]);

  return { ...auth, profile, payments, contacts, notifications, balances, loading, error, refresh };
}
