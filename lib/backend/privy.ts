import { PrivyClient } from "@privy-io/node";
import { encodeFunctionData, erc20Abi, getAddress, type Hex } from "viem";
import { activeChain, executionMode, requiredEnv } from "./config";
import { AppError } from "./errors";

let client: PrivyClient | undefined;

export function getPrivyClient() {
  if (!client) {
    client = new PrivyClient({
      appId: requiredEnv("PRIVY_APP_ID"),
      appSecret: requiredEnv("PRIVY_APP_SECRET"),
    });
  }
  return client;
}

export async function createEmbeddedWallet(privyUserId: string, internalUserId: string) {
  const wallet = await getPrivyClient().wallets().create({
    chain_type: "ethereum",
    owner: { user_id: privyUserId },
    display_name: ".verse wallet",
    external_id: `verse_${internalUserId.replace(/[^a-zA-Z0-9_-]/g, "_")}`.slice(0, 64),
    idempotency_key: `wallet_${internalUserId}`.slice(0, 64),
  });
  return { id: wallet.id, address: getAddress(wallet.address) };
}

export async function sendSponsoredErc20Transfer(input: {
  accessToken: string;
  walletId: string;
  tokenAddress: string;
  recipientAddress: string;
  amountAtomic: bigint;
  idempotencyKey: string;
}) {
  if (executionMode() === "disabled") {
    throw new AppError(
      503,
      "LIVE_EXECUTION_DISABLED",
      "Payment execution is not active yet.",
    );
  }

  const chain = activeChain();
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [getAddress(input.recipientAddress), input.amountAtomic],
  });

  const result = await getPrivyClient().wallets().ethereum().sendTransaction(
    input.walletId,
    {
      caip2: chain.caip2,
      params: {
        transaction: {
          to: getAddress(input.tokenAddress),
          data: data as Hex,
          value: "0x0",
        },
      },
      sponsor: true,
      reference_id: input.idempotencyKey,
      idempotency_key: input.idempotencyKey,
      authorization_context: { user_jwts: [input.accessToken] },
    },
  );

  return { txHash: result.hash, referenceId: result.reference_id ?? null };
}
