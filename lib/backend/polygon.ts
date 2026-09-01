import {
  createPublicClient,
  http,
  parseEventLogs,
  type Hash,
} from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { activeChain, requiredEnv } from "./config";
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
