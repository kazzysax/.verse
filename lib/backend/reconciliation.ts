import { and, asc, eq, inArray, isNull, lt } from "drizzle-orm";
import { apiRateLimits, chainOperations, domainOrders, payments } from "@/db/schema";
import { getDb } from "@/db";
import { readPaymentReceipt, readTransactionState } from "./polygon";
import { reconcileTransactionEvent } from "./chain-operations";
import { dispatchDomainMint } from "./domains";
import { readPrivyTransaction } from "./privy";

export async function reconcileStaleOperations(now = new Date(), userId?: string) {
  const reserved = await getDb().select().from(domainOrders).where(and(
    eq(domainOrders.status, "reserved"), eq(domainOrders.kind, "free"),
    isNull(domainOrders.mintOperationId),
    userId ? eq(domainOrders.userId, userId) : undefined,
  )).limit(5);
  for (const order of reserved) {
    try { await dispatchDomainMint(order.id); }
    catch { /* Keep unsubmitted claims available for the next recovery pass. */ }
  }
  const cutoff = new Date(now.getTime() - (userId ? 3000 : 2 * 60_000)).toISOString();
  const rows = await getDb()
    .select()
    .from(chainOperations)
    .where(
      and(
        inArray(chainOperations.status, ["submitted", "unknown"]),
        lt(chainOperations.updatedAt, cutoff),
        userId ? eq(chainOperations.userId, userId) : undefined,
      ),
    )
    .orderBy(asc(chainOperations.updatedAt))
    .limit(userId ? 10 : 50);

  const result = { checked: rows.length, confirmed: 0, failed: 0, unresolved: 0 };
  for (const operation of rows) {
    if (!operation.txHash) {
      if (!operation.providerTransactionId) {
        result.unresolved += 1;
        continue;
      }
      try {
        const providerState = await readPrivyTransaction(operation.providerTransactionId);
        if (["transaction.confirmed", "transaction.finalized"].includes(providerState.type)) {
          if (!providerState.transactionHash) { result.unresolved += 1; continue; }
          const state = await readTransactionState(providerState.transactionHash);
          providerState.type = state === "confirmed" ? "transaction.confirmed" : "transaction.failed";
        }
        await reconcileTransactionEvent({
          type: providerState.type,
          referenceId: operation.providerRequestId,
          transactionHash: providerState.transactionHash,
          transactionId: providerState.transactionId,
        });
        if (providerState.type === "transaction.confirmed" || providerState.type === "transaction.finalized") result.confirmed += 1;
        else if (["transaction.failed", "transaction.execution_reverted", "transaction.provider_error"].includes(providerState.type)) result.failed += 1;
        else result.unresolved += 1;
      } catch {
        result.unresolved += 1;
      }
      continue;
    }
    try {
      const [payment] = operation.kind === "p2p_payment"
        ? await getDb().select().from(payments).where(eq(payments.id, operation.aggregateId)).limit(1) : [];
      const state = payment ? await readPaymentReceipt({ txHash: operation.txHash,
        senderAddress: payment.fromWallet, tokenAddress: payment.tokenAddress,
        recipientAddress: payment.toWallet, amountAtomic: BigInt(payment.amountAtomic) })
        : await readTransactionState(operation.txHash);
      if (state === "submitted") { result.unresolved += 1; continue; }
      await reconcileTransactionEvent({
        type: state === "confirmed" ? "transaction.confirmed" : "transaction.failed",
        referenceId: operation.providerRequestId,
        transactionHash: operation.txHash,
        transactionId: operation.providerTransactionId ?? undefined,
      });
      result[state] += 1;
    } catch {
      result.unresolved += 1;
    }
  }
  return result;
}

export async function cleanupOperationalTables(now = new Date()) {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const deleted = await getDb()
    .delete(apiRateLimits)
    .where(lt(apiRateLimits.expiresAt, nowSeconds))
    .returning({ id: apiRateLimits.id });
  return { rateLimitRowsDeleted: deleted.length };
}
