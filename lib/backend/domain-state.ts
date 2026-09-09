import { and, eq } from "drizzle-orm";
import { domainOrders, domains, identities, notifications } from "@/db/schema";
import { getDb } from "@/db";
import { readNameMinted } from "./polygon";
import { keccak256, stringToHex } from "viem";

export async function reconcileDomainMint(input: {
  orderId: string;
  operationId: string;
  state: "submitted" | "confirmed" | "failed";
  txHash?: string | null;
  failureCode?: string | null;
}) {
  const db = getDb();
  const [row] = await db
    .select({ order: domainOrders, domain: domains })
    .from(domainOrders)
    .innerJoin(domains, eq(domainOrders.domainId, domains.id))
    .where(eq(domainOrders.id, input.orderId))
    .limit(1);
  if (!row || row.order.status === "active") return;
  const now = new Date().toISOString();

  if (input.state === "submitted") {
    await db.batch([
      db
        .update(domainOrders)
        .set({ status: "mint_submitted", updatedAt: now })
        .where(eq(domainOrders.id, row.order.id)),
      db
        .update(domains)
        .set({ status: "pending", mintedTxHash: input.txHash, updatedAt: now })
        .where(eq(domains.id, row.domain.id)),
    ]);
    return;
  }

  if (input.state === "failed") {
    await db.batch([
      db
        .update(domainOrders)
        .set({
          status: "manual_review",
          failureCode: input.failureCode ?? "MINT_FAILED",
          failureMessage: "The registry mint failed and requires review.",
          updatedAt: now,
        })
        .where(eq(domainOrders.id, row.order.id)),
      db
        .update(domains)
        .set({ status: "reserved", updatedAt: now })
        .where(eq(domains.id, row.domain.id)),
    ]);
    return;
  }

  if (!input.txHash) {
    await markManualReview(row.order.id, "MISSING_MINT_HASH");
    return;
  }
  try {
    const minted = await readNameMinted(input.txHash);
    if (
      minted.label !== row.domain.name ||
      minted.owner.toLowerCase() !== row.domain.ownerWalletAddress.toLowerCase() ||
      minted.requestId.toLowerCase() !==
        keccak256(stringToHex(input.operationId)).toLowerCase()
    ) {
      await markManualReview(row.order.id, "MINT_EVENT_MISMATCH");
      return;
    }
    await db.batch([
      db
        .update(domainOrders)
        .set({ status: "active", failureCode: null, failureMessage: null, updatedAt: now })
        .where(eq(domainOrders.id, row.order.id)),
      db
        .update(domains)
        .set({
          status: "active",
          tokenId: minted.tokenId,
          mintedTxHash: input.txHash,
          updatedAt: now,
        })
        .where(eq(domains.id, row.domain.id)),
      db
        .update(identities)
        .set({ verified: true, verifiedAt: now, updatedAt: now })
        .where(
          and(
            eq(identities.userId, row.order.userId),
            eq(identities.provider, "verse"),
            eq(identities.normalizedHandle, row.domain.name),
          ),
        ),
      db.insert(notifications).values({
        id: `domain_activated_${row.order.id}`,
        userId: row.order.userId,
        type: "domain_activated",
        title: `${row.domain.name}.verse is active`,
        body: "Your transferable .verse name is ready to receive payments.",
        channel: "in_app",
        status: "sent",
        createdAt: now,
        sentAt: now,
      }).onConflictDoNothing(),
    ]);
  } catch (error) {
    console.error("Domain mint receipt reconciliation failed", error);
    throw error;
  }
}

export async function reconcileDomainPayment(input: {
  orderId: string;
  state: "submitted" | "confirmed" | "failed";
  failureCode?: string | null;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  if (input.state === "submitted") {
    await db
      .update(domainOrders)
      .set({ status: "payment_submitted", updatedAt: now })
      .where(eq(domainOrders.id, input.orderId));
    return;
  }
  if (input.state === "failed") {
    await db
      .update(domainOrders)
      .set({
        status: "manual_review",
        failureCode: input.failureCode ?? "DOMAIN_PAYMENT_FAILED",
        failureMessage: "The domain payment failed after submission.",
        updatedAt: now,
      })
      .where(eq(domainOrders.id, input.orderId));
    return;
  }
  await db
    .update(domainOrders)
    .set({ status: "payment_confirmed", updatedAt: now })
    .where(eq(domainOrders.id, input.orderId));
  try {
    const { dispatchDomainMint } = await import("./domains");
    await dispatchDomainMint(input.orderId);
  } catch (error) {
    console.error("Confirmed domain payment could not dispatch mint", error);
    await db
      .update(domainOrders)
      .set({
        status: "manual_review",
        failureCode: "MINT_DISPATCH_FAILED",
        failureMessage: "Payment confirmed, but mint dispatch requires review.",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(domainOrders.id, input.orderId));
  }
}

async function markManualReview(orderId: string, code: string) {
  await getDb()
    .update(domainOrders)
    .set({
      status: "manual_review",
      failureCode: code,
      failureMessage: "The mint receipt requires manual review.",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(domainOrders.id, orderId));
}
