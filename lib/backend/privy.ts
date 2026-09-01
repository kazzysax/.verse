import { PrivyClient } from "@privy-io/node";
import {
  encodeFunctionData,
  erc20Abi,
  getAddress,
  keccak256,
  stringToHex,
  type Hex,
} from "viem";
import {
  activeChain,
  assertPaymentExecutionReady,
  optionalEnv,
  requiredEnv,
  assertRegistryExecutionReady,
} from "./config";
import { VERSE_NAME_REGISTRY_ABI } from "./contracts";

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
    ...(optionalEnv("PRIVY_WALLET_POLICY_ID")
      ? { policy_ids: [requiredEnv("PRIVY_WALLET_POLICY_ID")] }
      : {}),
  });
  return { id: wallet.id, address: getAddress(wallet.address) };
}

export async function sendSponsoredErc20Transfer(input: {
  accessToken: string;
  walletId: string;
  tokenAddress: string;
  recipientAddress: string;
  amountAtomic: bigint;
  providerRequestId: string;
}) {
  assertPaymentExecutionReady();

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
      reference_id: input.providerRequestId,
      idempotency_key: input.providerRequestId,
      authorization_context: { user_jwts: [input.accessToken] },
    },
  );

  return { txHash: result.hash };
}

export async function sendRegistryMint(input: {
  operationId: string;
  providerRequestId: string;
  recipientAddress: string;
  label: string;
}) {
  assertRegistryExecutionReady();
  const chain = activeChain();
  const walletId = requiredEnv("VERSE_REGISTRAR_WALLET_ID");
  const requestId = keccak256(stringToHex(input.operationId));
  const data = encodeFunctionData({
    abi: VERSE_NAME_REGISTRY_ABI,
    functionName: "mintName",
    args: [getAddress(input.recipientAddress), input.label, requestId],
  });
  const result = await getPrivyClient().wallets().ethereum().sendTransaction(
    walletId,
    {
      caip2: chain.caip2,
      params: {
        transaction: {
          to: getAddress(requiredEnv("VERSE_REGISTRY_ADDRESS")),
          data,
          value: "0x0",
        },
      },
      sponsor: true,
      reference_id: input.providerRequestId,
      idempotency_key: input.providerRequestId,
    },
  );
  return { txHash: result.hash, walletId, requestId };
}
