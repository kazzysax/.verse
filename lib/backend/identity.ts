import { and, eq } from "drizzle-orm";
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

export async function resolveRecipient(raw: string, provider?: IdentityProvider) {
  const target = normalizeRecipient(raw, provider);
  const db = getDb();

  if (target.provider === "verse") {
    const [result] = await db
      .select({
        identityId: identities.id,
        userId: users.id,
        walletAddress: users.walletAddress,
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
