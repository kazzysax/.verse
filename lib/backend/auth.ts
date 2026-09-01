import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { getDb } from "@/db";
import { AppError } from "./errors";
import { getPrivyClient } from "./privy";

export type AuthContext = {
  accessToken: string;
  privyUserId: string;
  user: typeof users.$inferSelect | null;
};

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "AUTH_REQUIRED", "A Privy access token is required.");
  }
  const token = header.slice(7).trim();
  if (!token) throw new AppError(401, "AUTH_REQUIRED", "A Privy access token is required.");
  return token;
}

export async function authenticate(request: Request): Promise<AuthContext> {
  const accessToken = bearerToken(request);
  let verified: { user_id: string };
  try {
    verified = await getPrivyClient().utils().auth().verifyAccessToken(accessToken);
  } catch {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "The Privy access token is invalid or expired.");
  }
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.privyUserId, verified.user_id))
    .limit(1);
  if (user?.status === "suspended") {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "This account is suspended.");
  }
  return { accessToken, privyUserId: verified.user_id, user: user ?? null };
}

export async function requireUser(request: Request) {
  const auth = await authenticate(request);
  if (!auth.user) {
    throw new AppError(409, "ACCOUNT_NOT_BOOTSTRAPPED", "Create the .verse account before using this endpoint.");
  }
  return { ...auth, user: auth.user };
}
