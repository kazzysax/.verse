import { eq } from "drizzle-orm";
import { payments, webhookEvents } from "@/db/schema";
import { getDb } from "@/db";
import { optionalEnv } from "@/lib/backend/config";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json } from "@/lib/backend/http";
import { getPrivyClient } from "@/lib/backend/privy";

export const runtime = "edge";

const TRANSACTION_EVENTS = new Set([
  "transaction.broadcasted",
  "transaction.confirmed",
  "transaction.execution_reverted",
  "transaction.failed",
  "transaction.provider_error",
]);

export async function POST(request: Request) {
  try {
    const signingSecret = optionalEnv("PRIVY_WEBHOOK_SIGNING_SECRET");
    if (!signingSecret) {
      throw new AppError(503, "WEBHOOK_NOT_CONFIGURED", "Privy webhook verification is not configured.");
    }
    const rawBody = await request.text();
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new AppError(401, "INVALID_WEBHOOK", "Required webhook signature headers are missing.");
    }
    let event;
    try {
      event = getPrivyClient().webhooks().verify({
        payload: rawBody,
        headers: {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        },
        signing_secret: signingSecret,
      });
    } catch {
      throw new AppError(401, "INVALID_WEBHOOK", "Webhook signature verification failed.");
    }

    const db = getDb();
    const now = new Date().toISOString();
    const eventRecord = {
      id: crypto.randomUUID(),
      providerEventId: svixId,
      provider: "privy",
      type: event.type,
      payloadHash: await sha256(rawBody),
      status: "received" as const,
      createdAt: now,
    };
    const inserted = await db
      .insert(webhookEvents)
      .values(eventRecord)
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });
    if (!inserted.length) return json({ received: true, duplicate: true });

    if (TRANSACTION_EVENTS.has(event.type) && "reference_id" in event && event.reference_id) {
      const updates = transactionUpdate(event.type, event);
      await db
        .update(payments)
        .set({ ...updates, updatedAt: now })
        .where(eq(payments.idempotencyKey, event.reference_id));
    }
    await db
      .update(webhookEvents)
      .set({ status: "processed", processedAt: new Date().toISOString() })
      .where(eq(webhookEvents.id, eventRecord.id));
    return json({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
}

function transactionUpdate(type: string, event: { transaction_hash?: string; transaction_id?: string }) {
  if (type === "transaction.confirmed") {
    return {
      status: "confirmed" as const,
      txHash: event.transaction_hash,
      providerReferenceId: event.transaction_id,
      confirmedAt: new Date().toISOString(),
    };
  }
  if (type === "transaction.broadcasted") {
    return {
      status: "submitted" as const,
      txHash: event.transaction_hash,
      providerReferenceId: event.transaction_id,
      submittedAt: new Date().toISOString(),
    };
  }
  return {
    status: "failed" as const,
    txHash: event.transaction_hash,
    providerReferenceId: event.transaction_id,
    failureCode: type.replace("transaction.", "").toUpperCase(),
    failureMessage: "Privy reported that the transaction did not complete.",
  };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
