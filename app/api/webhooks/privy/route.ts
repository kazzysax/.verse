import { and, eq } from "drizzle-orm";
import { webhookEvents } from "@/db/schema";
import { getDb } from "@/db";
import { optionalEnv } from "@/lib/backend/config";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json } from "@/lib/backend/http";
import { getPrivyClient } from "@/lib/backend/privy";
import { reconcileTransactionEvent } from "@/lib/backend/chain-operations";

export const runtime = "edge";

const TRANSACTION_EVENTS = new Set([
  "transaction.broadcasted",
  "transaction.confirmed",
  "transaction.finalized",
  "transaction.execution_reverted",
  "transaction.failed",
  "transaction.provider_error",
  "transaction.replaced",
  "transaction.still_pending",
  "transaction.pending",
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
    const payloadHash = await sha256(rawBody);
    const eventRecord = {
      id: crypto.randomUUID(),
      providerEventId: svixId,
      provider: "privy",
      type: event.type,
      payloadHash,
      status: "received" as const,
      createdAt: now,
    };
    const inserted = await db
      .insert(webhookEvents)
      .values(eventRecord)
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });
    let recordId = inserted[0]?.id;
    if (!recordId) {
      const [existing] = await db
        .select()
        .from(webhookEvents)
        .where(
          and(
            eq(webhookEvents.provider, "privy"),
            eq(webhookEvents.providerEventId, svixId),
          ),
        )
        .limit(1);
      if (!existing || existing.provider !== "privy" || existing.payloadHash !== payloadHash) {
        throw new AppError(409, "WEBHOOK_EVENT_CONFLICT", "The webhook event ID conflicts with stored data.");
      }
      if (existing.status === "processed") {
        return json({ received: true, duplicate: true });
      }
      recordId = existing.id;
    }

    try {
      if (TRANSACTION_EVENTS.has(event.type) && "reference_id" in event && event.reference_id) {
        await reconcileTransactionEvent({
          type: event.type,
          referenceId: event.reference_id,
          transactionHash:
            "transaction_hash" in event ? event.transaction_hash : undefined,
          transactionId:
            "transaction_id" in event ? event.transaction_id : undefined,
        });
      }
      await db
        .update(webhookEvents)
        .set({ status: "processed", errorMessage: null, processedAt: new Date().toISOString() })
        .where(eq(webhookEvents.id, recordId));
    } catch (processingError) {
      await db
        .update(webhookEvents)
        .set({
          status: "failed",
          errorMessage: "Webhook reconciliation failed and will be retried.",
          processedAt: null,
        })
        .where(eq(webhookEvents.id, recordId));
      throw processingError;
    }
    return json({ received: true });
  } catch (error) {
    return errorResponse(error);
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
