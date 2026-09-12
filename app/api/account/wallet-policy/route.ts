import { z } from "zod";
import { requireUser } from "@/lib/backend/auth";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { enforceRateLimit } from "@/lib/backend/rate-limit";
import { applyUserWalletPolicyMigration, userWalletPolicyMigration } from "@/lib/backend/privy";

export const runtime = "edge";

function walletId(user: Awaited<ReturnType<typeof requireUser>>["user"]) {
  if (!user.privyWalletId) {
    throw new AppError(409, "WALLET_NOT_READY", "Complete wallet setup before sending.");
  }
  return user.privyWalletId;
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    await enforceRateLimit({ bucket: "wallet_policy_read", subject: auth.user.id, limit: 20, windowSeconds: 60 });
    return json(await userWalletPolicyMigration(walletId(auth.user)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await enforceRateLimit({ bucket: "wallet_policy_update", subject: auth.user.id, limit: 3, windowSeconds: 600 });
    const { signature } = z.object({ signature: z.string().trim().min(32).max(4096) }).parse(await readJson(request));
    return json(await applyUserWalletPolicyMigration(walletId(auth.user), signature));
  } catch (error) { return errorResponse(error); }
}
