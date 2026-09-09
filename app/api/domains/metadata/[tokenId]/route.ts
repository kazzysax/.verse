import { createPublicClient, http, parseAbi } from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { activeChain, requiredEnv } from "@/lib/backend/config";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json } from "@/lib/backend/http";

export const runtime = "edge";

export async function GET(_request: Request, context: { params: Promise<{ tokenId: string }> }) {
  try {
    const { tokenId } = await context.params;
    if (!/^[1-9][0-9]{0,77}$/.test(tokenId) || BigInt(tokenId) >= 2n ** 256n) {
      throw new AppError(400, "INVALID_TOKEN_ID", "Invalid name token ID.");
    }
    const client = createPublicClient({
      chain: activeChain().chainId === 137 ? polygon : polygonAmoy,
      transport: http(requiredEnv("POLYGON_RPC_URL"), { timeout: 10000, retryCount: 1 }),
    });
    const label = await client.readContract({
      address: requiredEnv("VERSE_REGISTRY_ADDRESS") as `0x${string}`,
      abi: parseAbi(["function labelOf(uint256 tokenId) view returns (string)"]),
      functionName: "labelOf", args: [BigInt(tokenId)],
    });
    return json({
      name: `${label}.verse`,
      description: "A transferable, lifetime .verse payment name. Payments resolve to its current registered owner.",
      attributes: [{ trait_type: "Name", value: label }, { trait_type: "Network", value: "Polygon" }],
    }, { headers: { "cache-control": "public, max-age=300" } });
  } catch (error) { return errorResponse(error); }
}
