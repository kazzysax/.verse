import { requireUser } from "@/lib/backend/auth";
import { activeChain, TOKEN_CONFIG } from "@/lib/backend/config";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json } from "@/lib/backend/http";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (!auth.user.walletAddress) {
      throw new AppError(409, "WALLET_NOT_READY", "Complete wallet setup before depositing.");
    }
    const chain = activeChain();
    const tokens = chain.mode === "amoy" ? TOKEN_CONFIG.amoy : TOKEN_CONFIG.mainnet;
    return json({
      walletAddress: auth.user.walletAddress,
      chainId: chain.chainId,
      network: chain.mode,
      tokens: Object.entries(tokens).filter((entry) => entry[1]).map(([asset, token]) => ({ asset, address: token?.address })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
