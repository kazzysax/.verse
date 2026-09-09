import { and, desc, eq, or } from "drizzle-orm";
import { encodeFunctionData, erc20Abi, formatUnits, getAddress, parseUnits } from "viem";
import {
  chainOperations,
  gasSponsorships,
  notifications,
  payments,
  users,
} from "@/db/schema";
import { getDb } from "@/db";
import {
  activeChain,
  requiredEnv,
  assertPaymentExecutionReady,
  DAILY_SPONSORED_PAYMENT_LIMIT,
  paymentExecutionReadiness,
  paymentsSponsored,
  type PaymentAsset,
  tokenFor,
} from "./config";
import { AppError } from "./errors";
import { operationRecord, reconcileTransactionEvent } from "./chain-operations";
import { sponsorshipRecord, sponsoredUsage } from "./gas-policy";
import { resolveRecipient, type IdentityProvider } from "./identity";
import { checkTransferFunding, readPaymentReceipt, verifyErc20Transfer } from "./polygon";
import { signPaymentSnapshot, verifyPaymentSnapshot } from "./payment-quote";
import { normalizeRecipient } from "./identity-normalization";
import { recordAudit } from "./audit";

export async function quotePayment(input: {
  senderUserId: string;
  recipient: string;
  provider?: IdentityProvider;
  asset: PaymentAsset;
  amount: string;
  memo?: string;
}) {
  const sender = await getUser(input.senderUserId);
  const recipient = await resolveRecipient(input.recipient, input.provider);
  if (sender.id === recipient.userId) {
    throw new AppError(400, "SELF_PAYMENT_NOT_ALLOWED", "Choose a different recipient.");
  }
  const token = tokenFor(input.asset);
  const amountAtomic = parsePaymentAmount(input.amount, token.decimals);
  if (!sender.walletAddress || !recipient.walletAddress) {
    throw new AppError(409, "WALLET_NOT_READY", "Complete wallet setup before sending.");
  }
  const sponsored = paymentsSponsored();
  const gas = await checkTransferFunding({ walletAddress: sender.walletAddress, tokenAddress: token.address, tokenDecimals: token.decimals, recipientAddress: recipient.walletAddress, amountAtomic, sponsored });
  console.info("payment.preflight", { senderAddress: sender.walletAddress, enteredName: input.recipient,
    recipientAddress: recipient.walletAddress, chainId: activeChain().chainId, asset: input.asset,
    tokenAddress: token.address, rawAmount: amountAtomic.toString(), amount: formatUnits(amountAtomic, token.decimals),
    sponsored, gas, simulation: "passed" });
  const used = sponsored ? await sponsoredUsage(sender.id) : 0;
  const quoteToken = await signPaymentSnapshot({ purpose: "verse-payment-v1", senderUserId: sender.id,
    recipient: { userId: recipient.userId, identityId: recipient.identityId, walletAddress: getAddress(recipient.walletAddress),
      displayHandle: recipient.displayHandle, provider: recipient.provider, normalizedHandle: recipient.normalizedHandle },
    asset: input.asset, amountAtomic: amountAtomic.toString(), chainId: activeChain().chainId, tokenAddress: getAddress(token.address),
  }, requiredEnv("DOMAIN_QUOTE_SIGNING_SECRET"));
  return {
    quoteToken,
    recipient: {
      provider: recipient.provider,
      handle: recipient.displayHandle,
      walletAddress: getAddress(recipient.walletAddress),
    },
    asset: input.asset,
    amount: formatUnits(amountAtomic, token.decimals),
    amountAtomic: amountAtomic.toString(),
    tokenAddress: token.address,
    chainId: activeChain().chainId,
    sponsored,
    gas,
    executionEnabled: paymentExecutionReadiness().ready,
    dailySponsoredRemaining: sponsored ? Math.max(0, DAILY_SPONSORED_PAYMENT_LIMIT - used) : null,
    transaction: {
      from: getAddress(sender.walletAddress),
      to: getAddress(token.address),
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [getAddress(recipient.walletAddress), amountAtomic],
      }),
      chainId: activeChain().chainId,
    },
  };
}

export async function createPayment(input: {
  senderUserId: string;
  recipient: string;
  provider?: IdentityProvider;
  asset: PaymentAsset;
  amount: string;
  memo?: string;
  txHash: string;
  quoteToken: string;
  idempotencyKey: string;
}) {
  assertPaymentExecutionReady();
  const db = getDb();
  const sender = await getUser(input.senderUserId);
  if (!sender.walletAddress || !sender.privyWalletId) {
    throw new AppError(409, "WALLET_NOT_READY", "The sender wallet is not ready.");
  }

  const [existing] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.senderUserId, sender.id),
        eq(payments.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  if (existing) {
    if (existing.txHash?.toLowerCase() !== input.txHash.toLowerCase()) {
      throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This payment key is already associated with a different transaction.");
    }
    return presentPayment(existing);
  }

  const [existingTransaction] = await db
    .select()
    .from(payments)
    .where(eq(payments.txHash, input.txHash))
    .limit(1);
  if (existingTransaction) {
    if (existingTransaction.senderUserId === sender.id) return presentPayment(existingTransaction);
    throw new AppError(409, "PAYMENT_TRANSACTION_ALREADY_USED", "This transaction is already attached to another payment.");
  }

  // Preserve the authoritative recipient approved in the quote, even if the name
  // changes owner after broadcast. The signed snapshot never authorizes signing.
  const snapshot = await verifyPaymentSnapshot(input.quoteToken, sender.id, requiredEnv("DOMAIN_QUOTE_SIGNING_SECRET"));
  const target = normalizeRecipient(input.recipient, input.provider);
  const recipient = snapshot.recipient;
  if (target.provider !== recipient.provider || target.normalized !== recipient.normalizedHandle ||
      snapshot.asset !== input.asset || snapshot.chainId !== activeChain().chainId ||
      snapshot.tokenAddress !== getAddress(tokenFor(input.asset).address) ||
      snapshot.amountAtomic !== parsePaymentAmount(input.amount, tokenFor(input.asset).decimals).toString()) {
    throw new AppError(400, "PAYMENT_QUOTE_MISMATCH", "The payment does not match the approved quote.");
  }
  if (sender.id === recipient.userId) {
    throw new AppError(400, "SELF_PAYMENT_NOT_ALLOWED", "Choose a different recipient.");
  }
  if (!recipient.walletAddress) {
    throw new AppError(409, "RECIPIENT_WALLET_NOT_READY", "The recipient wallet is not ready.");
  }
  const recipientWallet = recipient.walletAddress;
  const token = tokenFor(input.asset);
  const amountAtomic = parsePaymentAmount(input.amount, token.decimals);
  const sponsored = paymentsSponsored();
  const verified = await verifyErc20Transfer({
    txHash: input.txHash,
    senderAddress: sender.walletAddress,
    tokenAddress: token.address,
    recipientAddress: recipientWallet,
    amountAtomic,
  });
  const now = new Date().toISOString();
  const paymentId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const providerRequestId = `pay_${operationId.replaceAll("-", "")}`;
  const record: typeof payments.$inferInsert = {
    id: paymentId,
    senderUserId: sender.id,
    recipientUserId: recipient.userId,
    recipientIdentityId: recipient.identityId,
    recipientDisplay: recipient.displayHandle,
    fromWallet: getAddress(sender.walletAddress),
    toWallet: getAddress(recipientWallet),
    asset: input.asset,
    tokenAddress: getAddress(token.address),
    amountAtomic: amountAtomic.toString(),
    amountDisplay: formatUnits(amountAtomic, token.decimals),
    memo: input.memo || null,
    chainId: activeChain().chainId,
    status: "submitted",
    sponsored,
    idempotencyKey: input.idempotencyKey,
    chainOperationId: operationId,
    txHash: verified.txHash,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.batch([
      db.insert(chainOperations).values({
        ...operationRecord({
          id: operationId,
          userId: sender.id,
          kind: "p2p_payment",
          aggregateId: paymentId,
          walletId: sender.privyWalletId,
          providerRequestId,
          now: new Date(now),
        }),
        txHash: verified.txHash,
        status: "submitted",
        attemptCount: 1,
        submittedAt: now,
      }),
      db.insert(payments).values(record),
      ...(sponsored ? [db.insert(gasSponsorships).values(
        sponsorshipRecord(operationId, sender.id, new Date(now)),
      )] : []),
    ]);
    await safeAudit({
      actorUserId: sender.id,
      action: "payment.submit",
      resourceType: "payment",
      resourceId: paymentId,
      outcome: "succeeded",
      metadata: { asset: input.asset, chainId: activeChain().chainId, sponsored },
    });
  } catch (error) {
    const [concurrent] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.senderUserId, sender.id),
          eq(payments.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (concurrent) return presentPayment(concurrent);
    if (String(error).includes("DAILY_SPONSORED_LIMIT")) {
      throw new AppError(
        429,
        "DAILY_GAS_LIMIT_REACHED",
        `The daily sponsored-payment limit of ${DAILY_SPONSORED_PAYMENT_LIMIT} has been reached.`,
      );
    }
    throw error;
  }

  try {
    await createPaymentNotifications(paymentId, sender.id, recipient.userId, input.asset, record.amountDisplay);
  } catch (notificationError) {
    console.error("Payment submitted but notification creation failed", notificationError);
  }

  const [created] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  return presentPayment(created);
}

async function safeAudit(input: Parameters<typeof recordAudit>[0]) {
  try {
    await recordAudit(input);
  } catch (auditError) {
    console.error("Audit record failed", auditError);
  }
}

export async function listPayments(userId: string, limit = 25) {
  const rows = await getDb()
    .select()
    .from(payments)
    .where(or(eq(payments.senderUserId, userId), eq(payments.recipientUserId, userId)))
    .orderBy(desc(payments.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
  return rows.map(presentPayment);
}

export async function getPaymentForUser(paymentId: string, userId: string) {
  const [payment] = await getDb()
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        or(eq(payments.senderUserId, userId), eq(payments.recipientUserId, userId)),
      ),
    )
    .limit(1);
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  if (payment.status === "submitted" && payment.txHash) {
    const state = await readPaymentReceipt({ txHash: payment.txHash, senderAddress: payment.fromWallet,
      tokenAddress: payment.tokenAddress, recipientAddress: payment.toWallet, amountAtomic: BigInt(payment.amountAtomic) });
    if (state !== "submitted" && payment.chainOperationId) {
      const [operation] = await getDb().select().from(chainOperations).where(eq(chainOperations.id, payment.chainOperationId)).limit(1);
      if (operation) await reconcileTransactionEvent({ type: state === "confirmed" ? "transaction.confirmed" : "transaction.failed",
        referenceId: operation.providerRequestId, transactionHash: payment.txHash });
      const [updated] = await getDb().select().from(payments).where(eq(payments.id, payment.id)).limit(1);
      return presentPayment(updated);
    }
  }
  return presentPayment(payment);
}

async function getUser(id: string) {
  const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  return user;
}

function parsePaymentAmount(raw: string, decimals: number) {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw.trim())) {
    throw new AppError(400, "INVALID_AMOUNT", "Enter a positive token amount.");
  }
  if ((raw.trim().split(".")[1]?.length ?? 0) > decimals) {
    throw new AppError(400, "INVALID_AMOUNT_PRECISION", `This asset supports up to ${decimals} decimals.`);
  }
  let amount: bigint;
  try {
    amount = parseUnits(raw.trim(), decimals);
  } catch {
    throw new AppError(400, "INVALID_AMOUNT_PRECISION", `This asset supports up to ${decimals} decimals.`);
  }
  if (amount <= 0n) throw new AppError(400, "INVALID_AMOUNT", "Enter a positive token amount.");
  return amount;
}

async function createPaymentNotifications(
  paymentId: string,
  senderUserId: string,
  recipientUserId: string,
  asset: PaymentAsset,
  amount: string,
) {
  const now = new Date().toISOString();
  await getDb().insert(notifications).values([
    {
      id: crypto.randomUUID(),
      userId: senderUserId,
      type: "payment_sent",
      paymentId,
      title: "Payment sent",
      body: `${amount} ${asset} was submitted.`,
      channel: "in_app",
      status: "sent",
      createdAt: now,
      sentAt: now,
    },
    {
      id: crypto.randomUUID(),
      userId: recipientUserId,
      type: "payment_received",
      paymentId,
      title: "Payment incoming",
      body: `${amount} ${asset} is on the way.`,
      channel: "in_app",
      status: "sent",
      createdAt: now,
      sentAt: now,
    },
    {
      id: crypto.randomUUID(),
      userId: recipientUserId,
      type: "payment_received_email",
      paymentId,
      title: "You received a .verse payment",
      body: `${amount} ${asset} is on the way.`,
      channel: "email",
      status: "pending",
      createdAt: now,
    },
  ]);
}

function presentPayment(payment: typeof payments.$inferSelect | undefined) {
  if (!payment) throw new AppError(500, "PAYMENT_PERSISTENCE_ERROR", "The payment record is unavailable.");
  const {
    fromWallet: _fromWallet,
    toWallet: _toWallet,
    tokenAddress: _tokenAddress,
    ...safePayment
  } = payment;
  void _fromWallet;
  void _toWallet;
  void _tokenAddress;
  return safePayment;
}
