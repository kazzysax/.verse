import { auditEvents } from "@/db/schema";
import { getDb } from "@/db";
import { optionalEnv } from "./config";

export async function recordAudit(input: {
  request?: Request;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  outcome: "accepted" | "succeeded" | "failed" | "unknown";
  metadata?: Record<string, string | number | boolean | null>;
}) {
  let requestFingerprint: string | null = null;
  const salt = optionalEnv("AUDIT_HASH_SALT");
  if (input.request && salt) {
    const ip = input.request.headers.get("cf-connecting-ip") ?? "unknown";
    const agent = input.request.headers.get("user-agent") ?? "unknown";
    requestFingerprint = await sha256(`${salt}:${ip}:${agent}`);
  }
  await getDb().insert(auditEvents).values({
    id: crypto.randomUUID(),
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    outcome: input.outcome,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    requestFingerprint,
    createdAt: new Date().toISOString(),
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
