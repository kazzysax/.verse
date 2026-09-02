import { requireUser } from "@/lib/backend/auth";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json } from "@/lib/backend/http";
import { readWalletBalances } from "@/lib/backend/polygon";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (!auth.user.walletAddress) {
      throw new AppError(409, "WALLET_NOT_READY", "Complete wallet setup before checking balances.");
    }
    return json(await readWalletBalances(auth.user.walletAddress));
  } catch (error) {
    return errorResponse(error);
  }
}
