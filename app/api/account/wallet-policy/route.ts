import { requireUser } from "@/lib/backend/auth";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json } from "@/lib/backend/http";
import { enforceRateLimit } from "@/lib/backend/rate-limit";
import { readUserWalletPolicies } from "@/lib/backend/privy";

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
    return json(await readUserWalletPolicies(walletId(auth.user)));
  } catch (error) {
    return errorResponse(error);
  }
}

// Older clients must refresh; payment quoting must never edit wallet authorization.
export async function POST(request: Request) {
  try {
    await requireUser(request);
    throw new AppError(409, "CLIENT_UPDATE_REQUIRED", "Refresh .verse to use the current payment flow. Wallet policies are preserved.");
  } catch (error) { return errorResponse(error); }
}
