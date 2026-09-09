import {
  createPublicClient,
  decodeFunctionData,
  erc20Abi,
  formatUnits,
  getAddress,
  http,
  isAddressEqual,
  parseEventLogs,
  keccak256,
  stringToHex,
  TransactionReceiptNotFoundError,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { activeChain, requiredEnv, registrySponsored, TOKEN_CONFIG } from "./config";
import { VERSE_NAME_REGISTRY_ABI } from "./contracts";
import { AppError } from "./errors";

export async function checkTransferFunding(input: {
  walletAddress: string;
  tokenAddress: string;
  tokenDecimals?: number;
  recipientAddress: string;
  amountAtomic: bigint;
  sponsored: boolean;
}) {
  const client = polygonClient();
  if (await client.getChainId() !== activeChain().chainId) {
    throw new AppError(503, "RPC_CHAIN_MISMATCH", "The payment RPC is connected to the wrong network.");
  }
  const account = getAddress(input.walletAddress);
  const address = getAddress(input.tokenAddress);
  if (input.tokenDecimals !== undefined && await client.readContract({ address, abi: erc20Abi, functionName: "decimals" }) !== input.tokenDecimals) {
    throw new AppError(503, "TOKEN_DECIMALS_MISMATCH", "The token configuration does not match its contract.");
  }
  const balance = await client.readContract({ address, abi: erc20Abi, functionName: "balanceOf", args: [account] });
  if (balance < input.amountAtomic) {
    throw new AppError(400, "INSUFFICIENT_TOKEN_BALANCE", "Add enough tokens to cover this payment.");
  }
  const simulation = await client.simulateContract({
    account, address, abi: erc20Abi, functionName: "transfer",
    args: [getAddress(input.recipientAddress), input.amountAtomic],
  });
  if (simulation.result !== true) {
    throw new AppError(400, "TRANSFER_SIMULATION_FAILED", "The token contract would not accept this transfer.");
  }
  if (input.sponsored) return null;
  const nativeBalance = await client.getBalance({ address: account });
  if (nativeBalance === 0n) {
    throw new AppError(400, "INSUFFICIENT_GAS", "Add POL on Polygon to your wallet to pay network fees.");
  }
  const gas = await client.estimateContractGas({
    account, address, abi: erc20Abi, functionName: "transfer",
    args: [getAddress(input.recipientAddress), input.amountAtomic],
  });
  const fees = await client.estimateFeesPerGas();
  // Leave a buffer for gas and fee changes between the quote and submission.
  const estimatedMaxFee = gas * fees.maxFeePerGas * 120n / 100n;
  if (nativeBalance < estimatedMaxFee) {
    throw new AppError(400, "INSUFFICIENT_GAS", "Add more POL on Polygon to cover this payment's network fee.");
  }
  return { symbol: "POL", estimatedMaxFee: formatUnits(estimatedMaxFee, 18) };
}

export async function verifyErc20Transfer(input: {
  txHash: string;
  senderAddress: string;
  tokenAddress: string;
  recipientAddress: string;
  amountAtomic: bigint;
}) {
  const client = polygonClient();
  let transaction: Awaited<ReturnType<typeof client.getTransaction>> | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      transaction = await client.getTransaction({ hash: input.txHash as Hash });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  if (!transaction) {
    throw new AppError(400, "PAYMENT_TRANSACTION_NOT_FOUND", "The Polygon transaction could not be found.");
  }
  const expectedSender = getAddress(input.senderAddress);
  const expectedToken = getAddress(input.tokenAddress);
  const expectedRecipient = getAddress(input.recipientAddress);
  if (
    !isAddressEqual(transaction.from, expectedSender) ||
    !transaction.to ||
    !isAddressEqual(transaction.to, expectedToken) ||
    transaction.value !== 0n
  ) {
    throw new AppError(400, "PAYMENT_TRANSACTION_MISMATCH", "The transaction does not match this payment.");
  }
  let decoded: ReturnType<typeof decodeFunctionData>;
  try {
    decoded = decodeFunctionData({ abi: erc20Abi, data: transaction.input });
  } catch {
    throw new AppError(400, "PAYMENT_TRANSACTION_MISMATCH", "The transaction is not a token transfer.");
  }
  if (decoded.functionName !== "transfer" || !decoded.args) {
    throw new AppError(400, "PAYMENT_TRANSACTION_MISMATCH", "The transaction is not the expected token transfer.");
  }
  const [recipient, amount] = decoded.args;
  if (
    typeof recipient !== "string" ||
    !isAddressEqual(getAddress(recipient), expectedRecipient) ||
    amount !== input.amountAtomic
  ) {
    throw new AppError(400, "PAYMENT_TRANSACTION_MISMATCH", "The transfer recipient or amount does not match.");
  }
  return { txHash: transaction.hash };
}

export async function readPaymentReceipt(input: {
  txHash: string; senderAddress: string; tokenAddress: string;
  recipientAddress: string; amountAtomic: bigint;
}) {
  const client = polygonClient();
  let receipt;
  try { receipt = await client.getTransactionReceipt({ hash: input.txHash as Hash }); }
  catch (error) {
    if (error instanceof TransactionReceiptNotFoundError) return "submitted" as const;
    throw error;
  }
  if (receipt.status !== "success") return "failed" as const;
  if (!hasExpectedTransfer(receipt.logs, input)) return "failed" as const;
  if (await client.getBlockNumber() - receipt.blockNumber + 1n < 5n) return "submitted" as const;
  return "confirmed" as const;
}

export function hasExpectedTransfer(logs: TransactionReceipt["logs"], input: {
  senderAddress: string; tokenAddress: string; recipientAddress: string; amountAtomic: bigint;
}) {
  const events = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", strict: true,
    logs: logs.filter(log => isAddressEqual(log.address, getAddress(input.tokenAddress))) });
  return events.some(event => isAddressEqual(event.args.from, getAddress(input.senderAddress)) &&
    isAddressEqual(event.args.to, getAddress(input.recipientAddress)) && event.args.value === input.amountAtomic);
}

export async function readNameMinted(txHash: string) {
  const client = polygonClient();
  const receipt = await client.getTransactionReceipt({ hash: txHash as Hash });
  if (receipt.status !== "success") throw new Error("Registry transaction reverted.");
  const registry = getAddress(requiredEnv("VERSE_REGISTRY_ADDRESS"));
  const events = parseEventLogs({
    abi: VERSE_NAME_REGISTRY_ABI,
    eventName: "NameMinted",
    logs: receipt.logs.filter((log) => getAddress(log.address) === registry),
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
  const client = polygonClient();
  const receipt = await client.getTransactionReceipt({ hash: txHash as Hash });
  const block = await client.getBlockNumber();
  if (block - receipt.blockNumber + 1n < 5n) throw new Error("Transaction awaiting confirmations.");
  return receipt.status === "success" ? "confirmed" as const : "failed" as const;
}

export async function checkRegistryFunding(recipient: string, label: string) {
  if (registrySponsored()) return;
  const client = polygonClient();
  const account = getAddress(requiredEnv("REGISTRY_REGISTRAR_ADDRESS"));
  const balance = await client.getBalance({ address: account });
  if (balance === 0n) throw new AppError(503, "REGISTRAR_GAS_REQUIRED", "Name minting is temporarily unavailable while the minting wallet is funded. Your free name has not been used.");
  const gas = await client.estimateContractGas({
    account, address: getAddress(requiredEnv("VERSE_REGISTRY_ADDRESS")),
    abi: VERSE_NAME_REGISTRY_ABI, functionName: "mintName",
    args: [getAddress(recipient), label, keccak256(stringToHex(crypto.randomUUID()))],
  });
  const fees = await client.estimateFeesPerGas();
  if (balance < gas * fees.maxFeePerGas * 2n) throw new AppError(503, "REGISTRAR_GAS_REQUIRED", "The minting wallet needs more POL. Your free name has not been used.");
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
    gasBalance: { symbol: "POL", amount: formatUnits(await client.getBalance({ address: wallet }), 18) },
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
