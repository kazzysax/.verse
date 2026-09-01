import { and, eq, notInArray } from "drizzle-orm";
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
  const linkedAccounts = await getPrivyLinkedAccounts(input.privyUserId);
  const verifiedEmails = linkedAccounts
    .filter((account) => account.type === "email" && account.address)
    .map((account) => account.address!.toLowerCase());
  const requestedEmail = input.recoveryEmail?.toLowerCase();
  if (requestedEmail && !verifiedEmails.includes(requestedEmail)) {
    throw new AppError(
      400,
      "RECOVERY_EMAIL_NOT_VERIFIED",
      "Link and verify that recovery email with Privy before using it.",
    );
  }
  const verifiedRecoveryEmail = requestedEmail ?? verifiedEmails[0] ?? null;
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
      email: verifiedRecoveryEmail,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  } else if (verifiedRecoveryEmail && verifiedRecoveryEmail !== existing.email) {
    await db
      .update(users)
      .set({ email: verifiedRecoveryEmail, updatedAt: now })
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

  await syncAccounts(internalId, linkedAccounts);
  const [user] = await db.select().from(users).where(eq(users.id, internalId)).limit(1);
  return user;
}

export async function syncPrivyIdentities(userId: string, privyUserId: string) {
  const accounts = await getPrivyLinkedAccounts(privyUserId);
  await syncAccounts(userId, accounts);
  const verifiedEmail = accounts.find(
    (account) => account.type === "email" && account.address,
  )?.address?.toLowerCase() ?? null;
  await getDb()
    .update(users)
    .set({ email: verifiedEmail, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId));
}

async function getPrivyLinkedAccounts(privyUserId: string) {
  let privyUser;
  try {
    privyUser = await getPrivyClient().users()._get(privyUserId);
  } catch {
    throw new AppError(502, "PRIVY_USER_LOOKUP_FAILED", "Could not verify linked accounts with Privy.");
  }

  return privyUser.linked_accounts as PrivyLinkedAccount[];
}

async function syncAccounts(userId: string, accounts: PrivyLinkedAccount[]) {
  const seen: Record<"email" | "x" | "telegram", string[]> = {
    email: [],
    x: [],
    telegram: [],
  };
  for (const account of accounts) {
    if (account.type === "email" && account.address) {
      const normalized = account.address.toLowerCase();
      seen.email.push(normalized);
      await upsertIdentity(userId, "email", normalized, account.address, account.address);
    }
    if (account.type === "twitter_oauth" && account.username && account.subject) {
      const normalized = normalizeSocialHandle("x", account.username);
      seen.x.push(normalized);
      await upsertIdentity(userId, "x", normalized, `@${account.username}`, account.subject);
    }
    if (account.type === "telegram" && account.username && account.telegram_user_id) {
      const normalized = normalizeSocialHandle("telegram", account.username);
      seen.telegram.push(normalized);
      await upsertIdentity(userId, "telegram", normalized, `@${account.username}`, account.telegram_user_id);
    }
  }
  const now = new Date().toISOString();
  for (const provider of ["email", "x", "telegram"] as const) {
    const handles = [...new Set(seen[provider])];
    await getDb()
      .update(identities)
      .set({ verified: false, verifiedAt: null, updatedAt: now })
      .where(
        handles.length
          ? and(
              eq(identities.userId, userId),
              eq(identities.provider, provider),
              notInArray(identities.normalizedHandle, handles),
            )
          : and(eq(identities.userId, userId), eq(identities.provider, provider)),
      );
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
