import { and, count, eq, ne } from "drizzle-orm";
import { gasSponsorships } from "@/db/schema";
import { getDb } from "@/db";
import { DAILY_SPONSORED_PAYMENT_LIMIT } from "./config";

export function utcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function sponsorshipRecord(operationId: string, userId: string, now = new Date()) {
  const timestamp = now.toISOString();
  return {
    operationId,
    userId,
    dayKey: utcDayKey(now),
    status: "reserved" as const,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function sponsoredUsage(userId: string, now = new Date()) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(gasSponsorships)
    .where(
      and(
        eq(gasSponsorships.userId, userId),
        eq(gasSponsorships.dayKey, utcDayKey(now)),
        ne(gasSponsorships.status, "released"),
      ),
    )
  return Math.min(row?.value ?? 0, DAILY_SPONSORED_PAYMENT_LIMIT);
}

export async function markSponsorship(
  operationId: string,
  status: "consumed" | "released",
) {
  await getDb()
    .update(gasSponsorships)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(gasSponsorships.operationId, operationId));
}
