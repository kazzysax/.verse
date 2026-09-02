import { and, asc, inArray, lt } from "drizzle-orm";
import { apiRateLimits, chainOperations } from "@/db/schema";
import { getDb } from "@/db";
import { readTransactionState } from "./polygon";
import { reconcileTransactionEvent } from "./chain-operations";
import { readPrivyTransaction } from "./privy";

export async function reconcileStaleOperations(now = new Date()) {
  const cutoff = new Date(now.getTime() - 2 * 60_000).toISOString();
  const rows = await getDb()
    .select()
    .from(chainOperations)
    .where(
      and(
        inArray(chainOperations.status, ["submitted", "unknown"]),
        lt(chainOperations.updatedAt, cutoff),
      ),
    )
    .orderBy(asc(chainOperations.updatedAt))
    .limit(50);

  const result = { checked: rows.length, confirmed: 0, failed: 0, unresolved: 0 };
  for (const operation of rows) {
    if (!operation.txHash) {
      if (!operation.providerTransactionId) {
        result.unresolved += 1;
        continue;
      }
      try {
        const providerState = await readPrivyTransaction(operation.providerTransactionId);
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
      const state = await readTransactionState(operation.txHash);
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
