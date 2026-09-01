import { and, count, eq } from "drizzle-orm";
import { domains, identities, users } from "@/db/schema";
import { getDb } from "@/db";
import { AppError } from "./errors";
export {
  normalizeRecipient,
  normalizeSocialHandle,
  normalizeVerseName,
  type IdentityProvider,
} from "./identity-normalization";
import { normalizeRecipient, type IdentityProvider } from "./identity-normalization";
import { getAddress, zeroAddress } from "viem";
import { readNameOwner } from "./polygon";

export async function resolveRecipient(raw: string, provider?: IdentityProvider) {
  const target = normalizeRecipient(raw, provider);
  const db = getDb();

  if (target.provider === "verse") {
    const [result] = await db
      .select({
        domainId: domains.id,
        identityId: identities.id,
        userId: users.id,
        walletAddress: users.walletAddress,
        recordedOwnerWallet: domains.ownerWalletAddress,
        displayHandle: identities.displayHandle,
      })
      .from(domains)
      .innerJoin(users, eq(domains.ownerUserId, users.id))
      .leftJoin(
        identities,
        and(
          eq(identities.userId, users.id),
          eq(identities.provider, "verse"),
          eq(identities.normalizedHandle, target.normalized),
        ),
      )
      .where(and(eq(domains.name, target.normalized), eq(domains.status, "active")))
      .limit(1);
    if (!result?.walletAddress) {
      throw new AppError(404, "RECIPIENT_NOT_FOUND", "That .verse name is not registered and active.");
    }
    const onchainOwner = getAddress(await readNameOwner(target.normalized));
    if (onchainOwner === zeroAddress) {
      throw new AppError(409, "DOMAIN_NOT_MINTED", "That .verse name is not active on Polygon.");
    }
    if (
      onchainOwner.toLowerCase() !== result.recordedOwnerWallet.toLowerCase() ||
      onchainOwner.toLowerCase() !== result.walletAddress.toLowerCase()
    ) {
      return reconcileTransferredDomain({
        domainId: result.domainId,
        identityId: result.identityId,
        normalizedHandle: target.normalized,
        onchainOwner,
      });
    }
    return {
      ...result,
      displayHandle: result.displayHandle ?? `${target.normalized}.verse`,
      provider: target.provider,
      normalizedHandle: target.normalized,
    };
  }

  const [result] = await db
    .select({
      identityId: identities.id,
      userId: users.id,
      walletAddress: users.walletAddress,
      displayHandle: identities.displayHandle,
    })
    .from(identities)
    .innerJoin(users, eq(identities.userId, users.id))
    .where(
      and(
        eq(identities.provider, target.provider),
        eq(identities.normalizedHandle, target.normalized),
        eq(identities.verified, true),
      ),
    )
    .limit(1);
  if (!result?.walletAddress) {
    throw new AppError(404, "RECIPIENT_NOT_FOUND", "That verified handle is not registered.");
  }
  return { ...result, provider: target.provider, normalizedHandle: target.normalized };
}

async function reconcileTransferredDomain(input: {
  domainId: string;
  identityId: string | null;
  normalizedHandle: string;
  onchainOwner: string;
}) {
  const db = getDb();
  const [newOwner] = await db
    .select()
    .from(users)
    .where(eq(users.walletAddress, input.onchainOwner))
    .limit(1);
  const now = new Date().toISOString();
  if (!newOwner) {
    await db.batch([
      db
        .update(domains)
        .set({
          ownerWalletAddress: input.onchainOwner,
          status: "transferred",
          isPrimary: false,
          updatedAt: now,
        })
        .where(eq(domains.id, input.domainId)),
      ...(input.identityId
        ? [
            db
              .update(identities)
              .set({ verified: false, verifiedAt: null, updatedAt: now })
              .where(eq(identities.id, input.identityId)),
          ]
        : []),
    ]);
    throw new AppError(
      409,
      "DOMAIN_OWNER_REGISTRATION_REQUIRED",
      "The new domain owner must register their wallet before receiving by name.",
    );
  }
  const [primaryCount] = await db
    .select({ value: count() })
    .from(domains)
    .where(
      and(
        eq(domains.ownerUserId, newOwner.id),
        eq(domains.isPrimary, true),
        eq(domains.status, "active"),
      ),
    );
  const makePrimary = (primaryCount?.value ?? 0) === 0;
  await db.batch([
    db
      .update(domains)
      .set({
        ownerUserId: newOwner.id,
        ownerWalletAddress: input.onchainOwner,
        acquiredKind: "transfer",
        status: "active",
        isPrimary: makePrimary,
        updatedAt: now,
      })
      .where(eq(domains.id, input.domainId)),
    ...(input.identityId
      ? [
          db
            .update(identities)
            .set({
              userId: newOwner.id,
              verified: true,
              verifiedAt: now,
              updatedAt: now,
            })
            .where(eq(identities.id, input.identityId)),
        ]
      : []),
  ]);
  return {
    identityId: input.identityId,
    userId: newOwner.id,
    walletAddress: newOwner.walletAddress,
    displayHandle: `${input.normalizedHandle}.verse`,
    provider: "verse" as const,
    normalizedHandle: input.normalizedHandle,
  };
}
