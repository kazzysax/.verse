import { and, eq } from "drizzle-orm";
import { identities, users } from "@/db/schema";
import { getDb } from "@/db";
import { AppError } from "./errors";
import { normalizeSocialHandle } from "./identity-normalization";
import { createEmbeddedWallet, getPrivyClient } from "./privy";

type PrivyLinkedAccount = {
  type: string;
  address?: string | null;
  subject?: string | null;
  username?: string | null;
  telegram_user_id?: string | null;
};

export async function bootstrapUser(input: {
  privyUserId: string;
  recoveryEmail?: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, input.privyUserId))
    .limit(1);
  const internalId = existing?.id ?? crypto.randomUUID();

  if (!existing) {
    await db.insert(users).values({
      id: internalId,
      privyUserId: input.privyUserId,
      email: input.recoveryEmail?.toLowerCase(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  } else if (input.recoveryEmail && input.recoveryEmail.toLowerCase() !== existing.email) {
    await db
      .update(users)
      .set({ email: input.recoveryEmail.toLowerCase(), updatedAt: now })
      .where(eq(users.id, existing.id));
  }

  let walletId = existing?.privyWalletId ?? null;
  let walletAddress = existing?.walletAddress ?? null;
  if (!walletId || !walletAddress) {
    const wallet = await createEmbeddedWallet(input.privyUserId, internalId);
    walletId = wallet.id;
    walletAddress = wallet.address;
    await db
      .update(users)
      .set({ privyWalletId: walletId, walletAddress, updatedAt: new Date().toISOString() })
      .where(eq(users.id, internalId));
  }

  await syncPrivyIdentities(internalId, input.privyUserId);
  const [user] = await db.select().from(users).where(eq(users.id, internalId)).limit(1);
  return user;
}

export async function syncPrivyIdentities(userId: string, privyUserId: string) {
  let privyUser;
  try {
    privyUser = await getPrivyClient().users()._get(privyUserId);
  } catch {
    throw new AppError(502, "PRIVY_USER_LOOKUP_FAILED", "Could not verify linked accounts with Privy.");
  }

  const accounts = privyUser.linked_accounts as PrivyLinkedAccount[];
  for (const account of accounts) {
    if (account.type === "email" && account.address) {
      await upsertIdentity(userId, "email", account.address.toLowerCase(), account.address, account.address);
    }
    if (account.type === "twitter_oauth" && account.username && account.subject) {
      const normalized = normalizeSocialHandle("x", account.username);
      await upsertIdentity(userId, "x", normalized, `@${account.username}`, account.subject);
    }
    if (account.type === "telegram" && account.username && account.telegram_user_id) {
      const normalized = normalizeSocialHandle("telegram", account.username);
      await upsertIdentity(userId, "telegram", normalized, `@${account.username}`, account.telegram_user_id);
    }
  }
}

async function upsertIdentity(
  userId: string,
  provider: "email" | "x" | "telegram",
  normalizedHandle: string,
  displayHandle: string,
  providerSubject: string,
) {
  const now = new Date().toISOString();
  const [existing] = await getDb()
    .select()
    .from(identities)
    .where(
      and(
        eq(identities.provider, provider),
        eq(identities.normalizedHandle, normalizedHandle),
      ),
    )
    .limit(1);
  if (existing && existing.userId !== userId) {
    throw new AppError(409, "IDENTITY_ALREADY_CLAIMED", "A verified identity is already linked to another account.");
  }
  try {
    await getDb()
      .insert(identities)
      .values({
        id: crypto.randomUUID(),
        userId,
        provider,
        normalizedHandle,
        displayHandle,
        providerSubject,
        verified: true,
        verifiedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [identities.provider, identities.normalizedHandle],
        set: { displayHandle, providerSubject, verified: true, verifiedAt: now, updatedAt: now },
      });
  } catch {
    throw new AppError(409, "IDENTITY_ALREADY_CLAIMED", "A verified identity is already linked to another account.");
  }
}
