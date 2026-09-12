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
  requiredEnv,
  assertRegistryExecutionReady,
  paymentsSponsored,
  registrySponsored,
} from "./config";
import { VERSE_NAME_REGISTRY_ABI } from "./contracts";

let client: PrivyClient | undefined;

export function getPrivyClient() {
  if (!client) {
    client = new PrivyClient({
      appId: requiredEnv("PRIVY_APP_ID"),
      appSecret: requiredEnv("PRIVY_APP_SECRET"),
      timeout: 20000,
      maxRetries: 0,
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

export async function createServerTestWallet() {
  const wallet = await getPrivyClient().wallets().create({
    chain_type: "ethereum",
    display_name: ".verse payment test",
    idempotency_key: `verse_payment_test_${crypto.randomUUID()}`,
  });
  return { id: wallet.id, address: getAddress(wallet.address) };
}

export async function readUserWalletPolicies(walletId: string) {
  const wallet = await getPrivyClient().wallets().get(walletId);
  return { walletAddress: wallet.address, policyIds: wallet.policy_ids, authorizationThreshold: wallet.authorization_threshold };
}

export async function userWalletPolicyMigration(walletId: string) {
  const wallet = await getPrivyClient().wallets().get(walletId);
  if (!wallet.policy_ids?.length) return { required: false as const };

  return {
    required: true as const,
    request: {
      version: 1 as const,
      method: "PATCH" as const,
      url: `https://api.privy.io/v1/wallets/${walletId}`,
      body: { policy_ids: [] as string[] },
      headers: { "privy-app-id": requiredEnv("PRIVY_APP_ID") },
    },
  };
}

export async function applyUserWalletPolicyMigration(walletId: string, signature: string) {
  await getPrivyClient().wallets().update(walletId, {
    policy_ids: [],
    authorization_context: { signatures: [signature] },
  });

  const updated = await getPrivyClient().wallets().get(walletId);
  if (updated.policy_ids?.length) {
    throw new Error("Privy kept a restrictive policy attached to the wallet.");
  }

  return { migrated: true as const, walletAddress: updated.address };
}

export async function sendErc20Transfer(input: {
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
          chain_id: chain.chainId,
          to: getAddress(input.tokenAddress),
          data: data as Hex,
          value: "0x0",
        },
      },
      sponsor: paymentsSponsored(),
      reference_id: input.providerRequestId,
      idempotency_key: input.providerRequestId,
      authorization_context: { user_jwts: [input.accessToken] },
    },
  );

  return {
    txHash: result.hash || null,
    transactionId: result.transaction_id ?? null,
    userOperationHash: result.user_operation_hash ?? null,
  };
}

export async function sendServerErc20Transfer(input: {
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
          chain_id: chain.chainId,
          to: getAddress(input.tokenAddress),
          data: data as Hex,
          value: "0x0",
        },
      },
      sponsor: false,
      reference_id: input.providerRequestId,
      idempotency_key: input.providerRequestId,
    },
  );
  return {
    txHash: result.hash || null,
    transactionId: result.transaction_id ?? null,
    userOperationHash: result.user_operation_hash ?? null,
  };
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
          chain_id: chain.chainId,
          to: getAddress(requiredEnv("VERSE_REGISTRY_ADDRESS")),
          data,
          value: "0x0",
        },
      },
      sponsor: registrySponsored(),
      authorization_context: { authorization_private_keys: [requiredEnv("VERSE_REGISTRAR_AUTHORIZATION_KEY")] },
      reference_id: input.providerRequestId,
      idempotency_key: input.providerRequestId,
    },
  );
  return {
    txHash: result.hash || null,
    transactionId: result.transaction_id ?? null,
    userOperationHash: result.user_operation_hash ?? null,
    walletId,
    requestId,
  };
}

export async function readPrivyTransaction(transactionId: string) {
  const transaction = await getPrivyClient().transactions().get(transactionId);
  return {
    type: `transaction.${transaction.status}`,
    transactionHash: transaction.transaction_hash ?? undefined,
    transactionId: transaction.id,
    referenceId: transaction.reference_id ?? undefined,
  };
}
