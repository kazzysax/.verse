import { env } from "cloudflare:workers";
import { DAILY_SPONSORED_PAYMENT_LIMIT } from "./config";
import { AppError } from "./errors";

type CountRow = { count: number };

function d1() {
  if (!env.DB) throw new AppError(503, "DATABASE_UNAVAILABLE", "The database is unavailable.");
  return env.DB;
}

export function utcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export async function sponsoredUsage(userId: string, now = new Date()) {
  const row = await d1()
    .prepare("SELECT count FROM gas_usage WHERE user_id = ? AND day_key = ?")
    .bind(userId, utcDayKey(now))
    .first<CountRow>();
  return row?.count ?? 0;
}

export async function reserveSponsoredPayment(userId: string, now = new Date()) {
  const timestamp = now.toISOString();
  const row = await d1()
    .prepare(
      `INSERT INTO gas_usage (id, user_id, day_key, count, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(user_id, day_key) DO UPDATE SET
         count = count + 1,
         updated_at = excluded.updated_at
       WHERE gas_usage.count < ?
       RETURNING count`,
    )
    .bind(crypto.randomUUID(), userId, utcDayKey(now), timestamp, timestamp, DAILY_SPONSORED_PAYMENT_LIMIT)
    .first<CountRow>();
  if (!row) {
    throw new AppError(
      429,
      "DAILY_GAS_LIMIT_REACHED",
      `The daily sponsored-payment limit of ${DAILY_SPONSORED_PAYMENT_LIMIT} has been reached.`,
    );
  }
  return row.count;
}

export async function releaseSponsoredPayment(userId: string, now = new Date()) {
  await d1()
    .prepare(
      `UPDATE gas_usage
       SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END, updated_at = ?
       WHERE user_id = ? AND day_key = ?`,
    )
    .bind(now.toISOString(), userId, utcDayKey(now))
    .run();
}
