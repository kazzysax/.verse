import { and, count, eq } from "drizzle-orm";
import { domains, identities } from "@/db/schema";
import { getDb } from "@/db";
import { AppError } from "./errors";
import { normalizeVerseName } from "./identity-normalization";

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
  const [owned] = await db
    .select({ value: count() })
    .from(domains)
    .where(
      and(
        eq(domains.ownerUserId, input.userId),
        eq(domains.acquiredKind, "free"),
      ),
    );
  if ((owned?.value ?? 0) >= 1) {
    throw new AppError(
      409,
      "FREE_DOMAIN_ALREADY_CLAIMED",
      "This verified account has already claimed its free .verse domain.",
    );
  }

  const now = new Date().toISOString();
  const domainId = crypto.randomUUID();
  try {
    await db.insert(domains).values({
      id: domainId,
      name,
      ownerUserId: input.userId,
      ownerWalletAddress: input.walletAddress,
      status: "reserved",
      isPrimary: true,
      acquiredKind: "free",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(identities).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      provider: "verse",
      normalizedHandle: name,
      displayHandle: `${name}.verse`,
      verified: false,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    throw new AppError(409, "DOMAIN_UNAVAILABLE", "That .verse name is no longer available.");
  }

  return {
    id: domainId,
    name: `${name}.verse`,
    status: "reserved" as const,
    nextStep: "registry_mint",
  };
}
