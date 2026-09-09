import { and, eq } from "drizzle-orm";
import {
  chainOperations,
  domainOrders,
  domains,
  gasSponsorships,
  identities,
  users,
} from "@/db/schema";
import { getDb } from "@/db";
import {
  activeChain,
  assertRegistryExecutionReady,
  DAILY_SPONSORED_PAYMENT_LIMIT,
  requiredEnv,
  tokenFor,
  paymentsSponsored,
} from "./config";
import { AppError } from "./errors";
import { verifyPaidDomainQuote } from "./domain-pricing";
import { operationRecord, markOperationSubmitted, markOperationSubmissionError } from "./chain-operations";
import { sponsorshipRecord } from "./gas-policy";
import { sendErc20Transfer } from "./privy";
import { checkTransferFunding } from "./polygon";
import { classifySubmissionError } from "./provider-errors";
import { recordAudit } from "./audit";

export async function purchaseAdditionalDomain(input: {
  accessToken: string;
  userId: string;
  quoteToken: string;
}) {
  assertRegistryExecutionReady();
  const quote = await verifyPaidDomainQuote(input.quoteToken, input.userId);
  const db = getDb();
  const [existingOrder] = await db
    .select()
    .from(domainOrders)
    .where(eq(domainOrders.quoteId, quote.quoteId))
    .limit(1);
  if (existingOrder) return existingOrder;

  const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user?.walletAddress || !user.privyWalletId) {
    throw new AppError(409, "WALLET_NOT_READY", "The embedded wallet is not ready.");
  }
  if (!user.freeDomainClaimedAt) {
    throw new AppError(409, "FREE_DOMAIN_REQUIRED", "Claim the account's free .verse domain first.");
  }

  const ids = {
    domain: crypto.randomUUID(),
    order: crypto.randomUUID(),
    operation: crypto.randomUUID(),
  };
  const sponsored = paymentsSponsored();
  const token = tokenFor("VERSE");
  await checkTransferFunding({ walletAddress: user.walletAddress, tokenAddress: token.address, recipientAddress: requiredEnv("VERSE_TREASURY_ADDRESS"), amountAtomic: BigInt(quote.priceVerseAtomic), sponsored });
  const providerRequestId = `dpay_${ids.operation.replaceAll("-", "")}`;
  const now = new Date().toISOString();
  try {
    await db.batch([
      db.insert(domains).values({
        id: ids.domain,
        name: quote.name,
        ownerUserId: user.id,
        ownerWalletAddress: user.walletAddress,
        status: "reserved",
        isPrimary: false,
        acquiredKind: "paid",
        priceVerseAtomic: quote.priceVerseAtomic,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(identities).values({
        id: crypto.randomUUID(),
        userId: user.id,
        provider: "verse",
        normalizedHandle: quote.name,
        displayHandle: `${quote.name}.verse`,
        verified: false,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(chainOperations).values(
        operationRecord({
          id: ids.operation,
          userId: user.id,
          kind: "domain_payment",
          aggregateId: ids.order,
          walletId: user.privyWalletId,
          providerRequestId,
          now: new Date(now),
        }),
      ),
      db.insert(domainOrders).values({
        id: ids.order,
        domainId: ids.domain,
        userId: user.id,
        kind: "paid",
        quoteId: quote.quoteId,
        status: "reserved",
        priceVerseAtomic: quote.priceVerseAtomic,
        verseUsdMicros: quote.verseUsdMicros,
        quoteExpiresAt: quote.expiresAt,
        paymentOperationId: ids.operation,
        createdAt: now,
        updatedAt: now,
      }),
      ...(sponsored ? [db.insert(gasSponsorships).values(
        sponsorshipRecord(ids.operation, user.id, new Date(now)),
      )] : []),
    ]);
  } catch (error) {
    const [concurrent] = await db
      .select()
      .from(domainOrders)
      .where(eq(domainOrders.quoteId, quote.quoteId))
      .limit(1);
    if (concurrent) return concurrent;
    if (String(error).includes("DAILY_SPONSORED_LIMIT")) {
      throw new AppError(
        429,
        "DAILY_GAS_LIMIT_REACHED",
        `The daily sponsored-payment limit of ${DAILY_SPONSORED_PAYMENT_LIMIT} has been reached.`,
      );
    }
    if (String(error).includes("UNIQUE")) {
      throw new AppError(409, "DOMAIN_UNAVAILABLE", "That .verse name is no longer available.");
    }
    throw error;
  }

  try {
    const token = tokenFor("VERSE");
    const sent = await sendErc20Transfer({
      accessToken: input.accessToken,
      walletId: user.privyWalletId,
      tokenAddress: token.address,
      recipientAddress: requiredEnv("VERSE_TREASURY_ADDRESS"),
      amountAtomic: BigInt(quote.priceVerseAtomic),
      providerRequestId,
    });
    await markOperationSubmitted({ operationId: ids.operation, txHash: sent.txHash, providerTransactionId: sent.transactionId });
    await db
      .update(domainOrders)
      .set({ status: "payment_submitted", updatedAt: new Date().toISOString() })
      .where(eq(domainOrders.id, ids.order));
    await safeAudit({
      actorUserId: user.id,
      action: "domain.purchase.submit",
      resourceType: "domain_order",
      resourceId: ids.order,
      outcome: "succeeded",
      metadata: { chainId: activeChain().chainId },
    });
  } catch (error) {
    const classified = classifySubmissionError(error);
    await markOperationSubmissionError({ operationId: ids.operation, ...classified });
    await db
      .update(domainOrders)
      .set({
        status: classified.outcome === "unknown" ? "manual_review" : "failed",
        failureCode: classified.code,
        failureMessage: "The domain payment did not complete normally.",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(domainOrders.id, ids.order));
    await safeAudit({
      actorUserId: user.id,
      action: "domain.purchase.submit",
      resourceType: "domain_order",
      resourceId: ids.order,
      outcome: classified.outcome === "unknown" ? "unknown" : "failed",
      metadata: { code: classified.code },
    });
    if (classified.outcome === "definite_failure") {
      throw new AppError(502, "DOMAIN_PAYMENT_REJECTED", "The domain payment was rejected.", {
        orderId: ids.order,
      });
    }
  }
  const [order] = await db.select().from(domainOrders).where(eq(domainOrders.id, ids.order)).limit(1);
  return order;
}

export async function releaseFailedDomainOrder(orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({ order: domainOrders, operation: chainOperations, domain: domains })
    .from(domainOrders)
    .innerJoin(
      chainOperations,
      eq(domainOrders.paymentOperationId, chainOperations.id),
    )
    .innerJoin(domains, eq(domainOrders.domainId, domains.id))
    .where(eq(domainOrders.id, orderId))
    .limit(1);
  if (!row) throw new AppError(404, "DOMAIN_ORDER_NOT_FOUND", "Domain order not found.");
  if (
    row.order.status !== "failed" ||
    row.operation.status !== "failed" ||
    row.operation.txHash
  ) {
    throw new AppError(
      409,
      "DOMAIN_ORDER_NOT_RELEASABLE",
      "Only definitively rejected, unbroadcast domain orders can be released.",
    );
  }
  await db.batch([
    db.delete(domainOrders).where(eq(domainOrders.id, row.order.id)),
    db
      .delete(identities)
      .where(
        and(
          eq(identities.userId, row.order.userId),
          eq(identities.provider, "verse"),
          eq(identities.normalizedHandle, row.domain.name),
        ),
      ),
    db.delete(domains).where(eq(domains.id, row.domain.id)),
    db.delete(chainOperations).where(eq(chainOperations.id, row.operation.id)),
  ]);
  await safeAudit({
    actorUserId: row.order.userId,
    action: "domain.purchase.release",
    resourceType: "domain_order",
    resourceId: row.order.id,
    outcome: "succeeded",
  });
  return { released: true, name: `${row.domain.name}.verse` };
}

async function safeAudit(input: Parameters<typeof recordAudit>[0]) {
  try {
    await recordAudit(input);
  } catch (error) {
    console.error("Domain purchase audit failed", error);
  }
}
