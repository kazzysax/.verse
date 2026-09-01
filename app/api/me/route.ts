import { asc, eq } from "drizzle-orm";
import { domains, identities } from "@/db/schema";
import { getDb } from "@/db";
import { requireUser } from "@/lib/backend/auth";
import { errorResponse, json } from "@/lib/backend/http";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    const db = getDb();
    const [handles, names] = await Promise.all([
      db
        .select({
          provider: identities.provider,
          handle: identities.displayHandle,
          verified: identities.verified,
        })
        .from(identities)
        .where(eq(identities.userId, auth.user.id))
        .orderBy(asc(identities.provider)),
      db
        .select({ name: domains.name, status: domains.status, primary: domains.isPrimary })
        .from(domains)
        .where(eq(domains.ownerUserId, auth.user.id))
        .orderBy(asc(domains.createdAt)),
    ]);
    return json({
      profile: {
        id: auth.user.id,
        email: auth.user.email,
        walletReady: Boolean(auth.user.walletAddress && auth.user.privyWalletId),
        identities: handles,
        domains: names.map((domain) => ({ ...domain, name: `${domain.name}.verse` })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
