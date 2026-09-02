import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  getAddress,
  http,
  parseEventLogs,
  type Hash,
} from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { activeChain, requiredEnv, TOKEN_CONFIG } from "./config";
import { VERSE_NAME_REGISTRY_ABI } from "./contracts";

export async function readNameMinted(txHash: string) {
  const client = polygonClient();
  const receipt = await client.getTransactionReceipt({ hash: txHash as Hash });
  const events = parseEventLogs({
    abi: VERSE_NAME_REGISTRY_ABI,
    eventName: "NameMinted",
    logs: receipt.logs,
    strict: true,
  });
  const event = events[0];
  if (!event) throw new Error("NameMinted event was not found in the receipt.");
  return {
    tokenId: event.args.tokenId.toString(),
    label: event.args.label,
    owner: event.args.owner,
    requestId: event.args.requestId,
  };
}

export async function readTransactionState(txHash: string) {
  const receipt = await polygonClient().getTransactionReceipt({ hash: txHash as Hash });
  return receipt.status === "success" ? "confirmed" as const : "failed" as const;
}

export async function readNameOwner(label: string) {
  return polygonClient().readContract({
    address: requiredEnv("VERSE_REGISTRY_ADDRESS") as `0x${string}`,
    abi: VERSE_NAME_REGISTRY_ABI,
    functionName: "ownerOfName",
    args: [label],
  });
}

export async function readWalletBalances(walletAddress: string) {
  const chain = activeChain();
  const wallet = getAddress(walletAddress);
  const configuredTokens = chain.mode === "amoy" ? TOKEN_CONFIG.amoy : TOKEN_CONFIG.mainnet;
  const client = polygonClient();
  const entries = await Promise.all(
    (Object.keys(configuredTokens) as Array<keyof typeof configuredTokens>).map(async (asset) => {
      const token = configuredTokens[asset];
      if (!token) return [asset, null] as const;
      const atomic = await client.readContract({
        address: getAddress(token.address),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [wallet],
      });
      return [asset, { amount: formatUnits(atomic, token.decimals), decimals: token.decimals }] as const;
    }),
  );
  return {
    chainId: chain.chainId,
    network: chain.mode,
    balances: Object.fromEntries(entries) as Record<"USDC" | "VERSE", { amount: string; decimals: number } | null>,
  };
}

function polygonClient() {
  const chain = activeChain().mode === "amoy" ? polygonAmoy : polygon;
  return createPublicClient({
    chain,
    transport: http(requiredEnv("POLYGON_RPC_URL"), {
      retryCount: 2,
      timeout: 10_000,
    }),
  });
}
