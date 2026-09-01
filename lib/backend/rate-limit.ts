import { env } from "cloudflare:workers";
import { AppError } from "./errors";
import { optionalEnv } from "./config";

type CountRow = { count: number };

export async function enforceRateLimit(input: {
  bucket: string;
  subject: string;
  limit: number;
  windowSeconds: number;
  now?: Date;
}) {
  const nowMs = (input.now ?? new Date()).getTime();
  const nowSeconds = Math.floor(nowMs / 1000);
  const windowStart = nowSeconds - (nowSeconds % input.windowSeconds);
  const expiresAt = windowStart + input.windowSeconds * 2;
  const subjectHash = await sha256(
    `${optionalEnv("RATE_LIMIT_HASH_SALT") ?? "verse-rate-limit"}:${input.subject}`,
  );
  const id = `${input.bucket}:${subjectHash}:${windowStart}`;
  const row = await env.DB.prepare(
    `INSERT INTO api_rate_limits
       (id, bucket, subject_hash, window_start, count, expires_at)
     VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(id) DO UPDATE SET count = count + 1
     WHERE api_rate_limits.count < ?
     RETURNING count`,
  )
    .bind(id, input.bucket, subjectHash, windowStart, expiresAt, input.limit)
    .first<CountRow>();
  if (!row) {
    throw new AppError(
      429,
      "RATE_LIMITED",
      "Too many requests. Please wait before trying again.",
      { retryAfterSeconds: windowStart + input.windowSeconds - nowSeconds },
    );
  }
  return { remaining: Math.max(0, input.limit - row.count) };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
