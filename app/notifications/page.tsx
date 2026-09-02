"use client";

import { Bell, Check } from "lucide-react";
import { VersePageShell } from "@/components/verse-page-shell";
import { VerseLoader } from "@/components/verse-loader";
import { useVerseAccount } from "@/components/use-verse-account";
import { friendlyApiError, verseApi } from "@/lib/client/verse-api";
import { useState } from "react";

export default function NotificationsPage() {
  const account = useVerseAccount();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const markRead = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      await verseApi(`/api/notifications/${id}`, account.getAccessToken, { method: "PATCH" });
      await account.refresh();
    } catch (requestError) {
      setError(friendlyApiError(requestError));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <VersePageShell>
      <main className="relative z-10 mx-auto max-w-[760px] px-4 pb-32 pt-12 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-white/45">Updates</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-[-0.06em]">Notifications</h1>
        </div>

        <section className="mt-9 overflow-hidden rounded-[30px] border border-white/[.08] bg-[#13151f]/90 p-5 shadow-[0_28px_80px_rgba(0,0,0,.35)] sm:p-7">
          {account.loading && <VerseLoader className="mx-auto my-10 size-14" label="Loading notifications" />}
          {error && <p role="alert" className="mb-4 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}
          {!account.authenticated && !account.loading && (
            <button type="button" onClick={() => account.login()} className="verse-gradient mx-auto my-9 block rounded-full px-6 py-3 text-sm font-extrabold">
              Sign in to view notifications
            </button>
          )}
          {account.authenticated && !account.loading && !account.notifications.length && (
            <div className="py-12 text-center">
              <Bell className="mx-auto size-7 text-white/25" />
              <p className="mt-3 text-sm text-white/40">No notifications yet.</p>
            </div>
          )}
          <div className="divide-y divide-white/[.06]">
            {account.notifications.map((notification) => (
              <article key={notification.id} className="flex gap-4 py-5">
                <span className="verse-gradient grid size-11 shrink-0 place-items-center rounded-full"><Bell className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">{notification.title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/48">{notification.body}</p>
                  <p className="mt-2 text-xs text-white/30">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
                {!notification.readAt && (
                  <button type="button" disabled={busyId === notification.id} onClick={() => void markRead(notification.id)} aria-label="Mark as read" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[.06] text-white/60 disabled:opacity-40">
                    {busyId === notification.id ? <VerseLoader className="size-5" label="Marking notification read" /> : <Check className="size-4" />}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </VersePageShell>
  );
}
