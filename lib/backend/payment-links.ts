import { and, desc, eq } from "drizzle-orm";
import { domains, paymentLinks } from "@/db/schema";
import { getDb } from "@/db";
import { AppError } from "./errors";
import type { PaymentAsset } from "./config";

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createPaymentLink(input: {
  creatorUserId: string;
  asset?: PaymentAsset;
  amount?: string;
  memo?: string;
  expiresAt?: string;
  maxUses?: number;
}) {
  const db = getDb();
  const [primary] = await db
    .select()
    .from(domains)
    .where(
      and(
        eq(domains.ownerUserId, input.creatorUserId),
        eq(domains.isPrimary, true),
        eq(domains.status, "active"),
      ),
    )
    .limit(1);
  if (!primary) {
    throw new AppError(409, "ACTIVE_DOMAIN_REQUIRED", "An active primary .verse domain is required.");
  }
  if (input.expiresAt && new Date(input.expiresAt) <= new Date()) {
    throw new AppError(400, "INVALID_EXPIRY", "The expiry must be in the future.");
  }
  const now = new Date().toISOString();
  const link = {
    id: crypto.randomUUID(),
    publicToken: randomToken(),
    creatorUserId: input.creatorUserId,
    recipientDisplay: `${primary.name}.verse`,
    asset: input.asset,
    amountDisplay: input.amount,
    memo: input.memo,
    expiresAt: input.expiresAt,
    maxUses: input.maxUses,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(paymentLinks).values(link);
  return link;
}

export async function listPaymentLinks(creatorUserId: string) {
  return getDb()
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.creatorUserId, creatorUserId))
    .orderBy(desc(paymentLinks.createdAt))
    .limit(100);
}

export async function getPublicPaymentLink(publicToken: string) {
  const [link] = await getDb()
    .select()
    .from(paymentLinks)
    .where(and(eq(paymentLinks.publicToken, publicToken), eq(paymentLinks.status, "active")))
    .limit(1);
  if (!link) throw new AppError(404, "PAYMENT_LINK_NOT_FOUND", "Payment link not found.");
  if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
    throw new AppError(410, "PAYMENT_LINK_EXPIRED", "This payment link has expired.");
  }
  if (link.maxUses !== null && link.useCount >= link.maxUses) {
    throw new AppError(410, "PAYMENT_LINK_USED", "This payment link has reached its use limit.");
  }
  return link;
}
