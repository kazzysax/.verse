import { and, count, eq } from "drizzle-orm";
import {
  chainOperations,
  domainOrders,
  domains,
  identities,
  users,
} from "@/db/schema";
import { getDb } from "@/db";
import { AppError } from "./errors";
import { normalizeVerseName } from "./identity-normalization";
import { registryExecutionReadiness, requiredEnv } from "./config";
import {
  markOperationSubmissionError,
  markOperationSubmitted,
  operationRecord,
} from "./chain-operations";
import { sendRegistryMint } from "./privy";
import { classifySubmissionError } from "./provider-errors";
import { recordAudit } from "./audit";
import { readNameOwner } from "./polygon";
import { getAddress } from "viem";

export async function checkDomain(rawName: string) {
  const name = normalizeVerseName(rawName);
  const [domain] = await getDb().select({ id: domains.id }).from(domains).where(eq(domains.name, name)).limit(1);
  return { name: `${name}.verse`, available: !domain };
}

export async function claimFreeDomain(input: {
  userId: string;
  walletAddress: string | null;
  rawName: string;
}) {
  if (!input.walletAddress) throw new AppError(409, "WALLET_NOT_READY", "Create the embedded wallet first.");
  const db = getDb();
  const name = normalizeVerseName(input.rawName);
  const [claimant] = await db
    .select({ freeDomainClaimedAt: users.freeDomainClaimedAt })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (claimant?.freeDomainClaimedAt) {
    throw new AppError(
      409,
      "FREE_DOMAIN_ALREADY_CLAIMED",
      "This verified account has already claimed its free .verse domain.",
    );
  }

  const now = new Date().toISOString();
  const domainId = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(domains).values({
        id: domainId,
        name,
        ownerUserId: input.userId,
        ownerWalletAddress: input.walletAddress,
        status: "reserved",
        isPrimary: true,
        acquiredKind: "free",
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(identities).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        provider: "verse",
        normalizedHandle: name,
        displayHandle: `${name}.verse`,
        verified: false,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(domainOrders).values({
        id: orderId,
        domainId,
        userId: input.userId,
        kind: "free",
        status: "reserved",
        createdAt: now,
        updatedAt: now,
      }),
      db
        .update(users)
        .set({ freeDomainClaimedAt: now, updatedAt: now })
        .where(eq(users.id, input.userId)),
    ]);
  } catch {
    throw new AppError(409, "DOMAIN_UNAVAILABLE", "That .verse name is no longer available.");
  }

  await safeDomainAudit({
    actorUserId: input.userId,
    action: "domain.reserve",
    resourceType: "domain",
    resourceId: domainId,
    outcome: "accepted",
    metadata: { kind: "free" },
  });

  let mint = { status: "awaiting_registry_configuration" as string };
  if (registryExecutionReadiness().ready) {
    mint = await dispatchDomainMint(orderId);
  }

  return {
    id: domainId,
    name: `${name}.verse`,
    status: "reserved" as const,
    orderId,
    mint,
  };
}

export async function dispatchDomainMint(orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      order: domainOrders,
      domain: domains,
      user: users,
    })
    .from(domainOrders)
    .innerJoin(domains, eq(domainOrders.domainId, domains.id))
    .innerJoin(users, eq(domainOrders.userId, users.id))
    .where(eq(domainOrders.id, orderId))
    .limit(1);
  if (!row) throw new AppError(404, "DOMAIN_ORDER_NOT_FOUND", "Domain order not found.");
  if (row.order.status === "active") return { status: "active" };
  if (row.order.mintOperationId) {
    return { status: row.order.status, operationId: row.order.mintOperationId };
  }

  const readiness = registryExecutionReadiness();
  if (!readiness.ready) {
    throw new AppError(503, "REGISTRY_EXECUTION_NOT_READY", "Registry minting is not configured.");
  }
  const operationId = crypto.randomUUID();
  const providerRequestId = `mint_${operationId.replaceAll("-", "")}`;
  const now = new Date().toISOString();
  const registrarWalletId = requiredEnv("VERSE_REGISTRAR_WALLET_ID");
  try {
    await db.batch([
      db.insert(chainOperations).values(
        operationRecord({
          id: operationId,
          userId: row.user.id,
          kind: "domain_mint",
          aggregateId: row.order.id,
          walletId: registrarWalletId,
          providerRequestId,
          now: new Date(now),
        }),
      ),
      db
        .update(domainOrders)
        .set({ status: "mint_submitted", mintOperationId: operationId, updatedAt: now })
        .where(eq(domainOrders.id, row.order.id)),
      db
        .update(domains)
        .set({ status: "pending", updatedAt: now })
        .where(eq(domains.id, row.domain.id)),
    ]);
  } catch (error) {
    const [concurrent] = await db
      .select()
      .from(domainOrders)
      .where(eq(domainOrders.id, row.order.id))
      .limit(1);
    if (concurrent?.mintOperationId) {
      return { status: concurrent.status, operationId: concurrent.mintOperationId };
    }
    throw error;
  }

  try {
    const sent = await sendRegistryMint({
      operationId,
      providerRequestId,
      recipientAddress: row.domain.ownerWalletAddress,
      label: row.domain.name,
    });
    await markOperationSubmitted({ operationId, txHash: sent.txHash });
    await db
      .update(domains)
      .set({ mintedTxHash: sent.txHash, updatedAt: new Date().toISOString() })
      .where(eq(domains.id, row.domain.id));
    await safeDomainAudit({
      actorUserId: row.user.id,
      action: "domain.mint.submit",
      resourceType: "domain",
      resourceId: row.domain.id,
      outcome: "succeeded",
      metadata: { kind: row.order.kind },
    });
    return { status: "mint_submitted", operationId, txHash: sent.txHash };
  } catch (error) {
    const classified = classifySubmissionError(error);
    await markOperationSubmissionError({ operationId, ...classified });
    await db
      .update(domainOrders)
      .set({
        status: "manual_review",
        failureCode: classified.code,
        failureMessage: "The registry mint requires reconciliation.",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(domainOrders.id, row.order.id));
    await safeDomainAudit({
      actorUserId: row.user.id,
      action: "domain.mint.submit",
      resourceType: "domain",
      resourceId: row.domain.id,
      outcome: classified.outcome === "unknown" ? "unknown" : "failed",
      metadata: { code: classified.code },
    });
    return { status: "manual_review", operationId };
  }
}

export async function importTransferredDomain(input: {
  userId: string;
  walletAddress: string | null;
  rawName: string;
}) {
  if (!input.walletAddress) throw new AppError(409, "WALLET_NOT_READY", "The embedded wallet is not ready.");
  const name = normalizeVerseName(input.rawName);
  const db = getDb();
  const [domain] = await db
    .select()
    .from(domains)
    .where(eq(domains.name, name))
    .limit(1);
  if (!domain?.tokenId) {
    throw new AppError(404, "DOMAIN_NOT_FOUND", "That minted .verse name was not found.");
  }
  const onchainOwner = getAddress(await readNameOwner(name));
  if (onchainOwner.toLowerCase() !== input.walletAddress.toLowerCase()) {
    throw new AppError(403, "DOMAIN_OWNERSHIP_MISMATCH", "The embedded wallet does not own that domain.");
  }
  const [primaryCount] = await db
    .select({ value: count() })
    .from(domains)
    .where(
      and(
        eq(domains.ownerUserId, input.userId),
        eq(domains.isPrimary, true),
        eq(domains.status, "active"),
      ),
    );
  const now = new Date().toISOString();
  await db.batch([
    db
      .update(domains)
      .set({
        ownerUserId: input.userId,
        ownerWalletAddress: onchainOwner,
        status: "active",
        acquiredKind: "transfer",
        isPrimary: (primaryCount?.value ?? 0) === 0,
        updatedAt: now,
      })
      .where(eq(domains.id, domain.id)),
    db
      .update(identities)
      .set({ userId: input.userId, verified: true, verifiedAt: now, updatedAt: now })
      .where(
        and(
          eq(identities.provider, "verse"),
          eq(identities.normalizedHandle, name),
        ),
      ),
  ]);
  await safeDomainAudit({
    actorUserId: input.userId,
    action: "domain.transfer.import",
    resourceType: "domain",
    resourceId: domain.id,
    outcome: "succeeded",
  });
  return { id: domain.id, name: `${name}.verse`, status: "active" as const };
}

async function safeDomainAudit(input: Parameters<typeof recordAudit>[0]) {
  try {
    await recordAudit(input);
  } catch (auditError) {
    console.error("Domain audit record failed", auditError);
  }
}
