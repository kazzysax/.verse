import { eq } from "drizzle-orm";
import { chainOperations, gasSponsorships, payments } from "@/db/schema";
import { getDb } from "@/db";
import { reconcileDomainMint, reconcileDomainPayment } from "./domain-state";

export type TransactionEvent = {
  type: string;
  referenceId: string;
  transactionHash?: string;
  transactionId?: string;
};

export function operationRecord(input: {
  id: string;
  userId: string | null;
  kind: "p2p_payment" | "domain_payment" | "domain_mint";
  aggregateId: string;
  walletId: string;
  providerRequestId: string;
  now?: Date;
}) {
  const timestamp = (input.now ?? new Date()).toISOString();
  return {
    id: input.id,
    userId: input.userId,
    kind: input.kind,
    aggregateId: input.aggregateId,
    walletId: input.walletId,
    providerRequestId: input.providerRequestId,
    status: "created" as const,
    attemptCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function markOperationSubmitted(input: {
  operationId: string;
  txHash: string;
  providerTransactionId?: string | null;
}) {
  const now = new Date().toISOString();
  const db = getDb();
  await db.batch([
    db
      .update(chainOperations)
      .set({
        status: "submitted",
        txHash: input.txHash,
        providerTransactionId: input.providerTransactionId ?? null,
        attemptCount: 1,
        submittedAt: now,
        updatedAt: now,
      })
      .where(eq(chainOperations.id, input.operationId)),
    db
      .update(gasSponsorships)
      .set({ status: "consumed", updatedAt: now })
      .where(eq(gasSponsorships.operationId, input.operationId)),
  ]);
}

export async function markOperationSubmissionError(input: {
  operationId: string;
  outcome: "definite_failure" | "unknown";
  code: string;
}) {
  const now = new Date().toISOString();
  const db = getDb();
  const status = input.outcome === "definite_failure" ? "failed" : "unknown";
  const operationUpdate = db
    .update(chainOperations)
    .set({
      status,
      attemptCount: 1,
      failureCode: input.code,
      failureMessage:
        input.outcome === "unknown"
          ? "The provider response was inconclusive; reconciliation is pending."
          : "The provider rejected the transaction before broadcast.",
      updatedAt: now,
    })
    .where(eq(chainOperations.id, input.operationId));
  if (input.outcome === "definite_failure") {
    await db.batch([
      operationUpdate,
      db
        .update(gasSponsorships)
        .set({ status: "released", updatedAt: now })
        .where(eq(gasSponsorships.operationId, input.operationId)),
    ]);
    return;
  }
  await operationUpdate;
}

export async function reconcileTransactionEvent(event: TransactionEvent) {
  const db = getDb();
  const [operation] = await db
    .select()
    .from(chainOperations)
    .where(eq(chainOperations.providerRequestId, event.referenceId))
    .limit(1);
  if (!operation) return { matched: false };
  if (operation.status === "confirmed") return { matched: true, terminal: true };

  const now = new Date().toISOString();
  const next = eventState(event.type);
  if (!next) return { matched: true, ignored: true };
  if (operation.status === "failed" && next.operationStatus === "submitted") {
    return { matched: true, terminal: true, ignored: true };
  }

  await db.batch([
    db
      .update(chainOperations)
      .set({
        status: next.operationStatus,
        txHash: event.transactionHash ?? operation.txHash,
        providerTransactionId: event.transactionId ?? operation.providerTransactionId,
        submittedAt: next.operationStatus === "submitted" ? operation.submittedAt ?? now : operation.submittedAt,
        confirmedAt: next.operationStatus === "confirmed" ? now : operation.confirmedAt,
        failureCode: next.failureCode,
        failureMessage: next.failureCode
          ? "Privy reported that the transaction did not complete."
          : null,
        updatedAt: now,
      })
      .where(eq(chainOperations.id, operation.id)),
    db
      .update(gasSponsorships)
      .set({ status: next.sponsorshipStatus, updatedAt: now })
      .where(eq(gasSponsorships.operationId, operation.id)),
  ]);

  if (operation.kind === "p2p_payment") {
    await db
      .update(payments)
      .set({
        status: next.paymentStatus,
        txHash: event.transactionHash ?? operation.txHash,
        providerReferenceId: event.transactionId ?? operation.providerTransactionId,
        submittedAt: next.paymentStatus === "submitted" ? operation.submittedAt ?? now : operation.submittedAt,
        confirmedAt: next.paymentStatus === "confirmed" ? now : null,
        failureCode: next.failureCode,
        failureMessage: next.failureCode
          ? "Privy reported that the transaction did not complete."
          : null,
        updatedAt: now,
      })
      .where(eq(payments.id, operation.aggregateId));
  }
  if (operation.kind === "domain_mint") {
    await reconcileDomainMint({
      orderId: operation.aggregateId,
      operationId: operation.id,
      state:
        next.operationStatus === "confirmed"
          ? "confirmed"
          : next.operationStatus === "failed"
            ? "failed"
            : "submitted",
      txHash: event.transactionHash ?? operation.txHash,
      failureCode: next.failureCode,
    });
  }
  if (operation.kind === "domain_payment") {
    await reconcileDomainPayment({
      orderId: operation.aggregateId,
      state:
        next.operationStatus === "confirmed"
          ? "confirmed"
          : next.operationStatus === "failed"
            ? "failed"
            : "submitted",
      failureCode: next.failureCode,
    });
  }
  return { matched: true, operationId: operation.id, kind: operation.kind };
}

function eventState(type: string) {
  if (type === "transaction.confirmed") {
    return {
      operationStatus: "confirmed" as const,
      paymentStatus: "confirmed" as const,
      sponsorshipStatus: "consumed" as const,
      failureCode: null,
    };
  }
  if (
    type === "transaction.broadcasted" ||
    type === "transaction.still_pending" ||
    type === "transaction.replaced"
  ) {
    return {
      operationStatus: "submitted" as const,
      paymentStatus: "submitted" as const,
      sponsorshipStatus: "consumed" as const,
      failureCode: null,
    };
  }
  if (
    type === "transaction.execution_reverted" ||
    type === "transaction.failed" ||
    type === "transaction.provider_error"
  ) {
    return {
      operationStatus: "failed" as const,
      paymentStatus: "failed" as const,
      sponsorshipStatus: "consumed" as const,
      failureCode: type.replace("transaction.", "").toUpperCase(),
    };
  }
  return null;
}
