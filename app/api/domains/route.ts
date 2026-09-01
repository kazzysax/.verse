import { asc, eq } from "drizzle-orm";
import { domains } from "@/db/schema";
import { getDb } from "@/db";
import { requireUser } from "@/lib/backend/auth";
import { errorResponse, json } from "@/lib/backend/http";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    const rows = await getDb()
      .select()
      .from(domains)
      .where(eq(domains.ownerUserId, auth.user.id))
      .orderBy(asc(domains.createdAt));
    return json({
      domains: rows.map((row) => {
        const { ownerWalletAddress, ...domain } = row;
        void ownerWalletAddress;
        return { ...domain, name: `${domain.name}.verse` };
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
