import { and, desc, eq, or } from "drizzle-orm";
import { formatUnits, getAddress, parseUnits } from "viem";
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
  assertPaymentExecutionReady,
  DAILY_SPONSORED_PAYMENT_LIMIT,
  paymentExecutionReadiness,
  type PaymentAsset,
  tokenFor,
} from "./config";
import { AppError } from "./errors";
import {
  markOperationSubmissionError,
  markOperationSubmitted,
  operationRecord,
} from "./chain-operations";
import { sponsorshipRecord, sponsoredUsage } from "./gas-policy";
import { resolveRecipient, type IdentityProvider } from "./identity";
import { sendSponsoredErc20Transfer } from "./privy";
import { classifySubmissionError } from "./provider-errors";
import { recordAudit } from "./audit";

export async function quotePayment(input: {
  senderUserId: string;
  recipient: string;
  provider?: IdentityProvider;
  asset: PaymentAsset;
  amount: string;
}) {
  const sender = await getUser(input.senderUserId);
  const recipient = await resolveRecipient(input.recipient, input.provider);
  if (sender.id === recipient.userId) {
    throw new AppError(400, "SELF_PAYMENT_NOT_ALLOWED", "Choose a different recipient.");
  }
  const token = tokenFor(input.asset);
  const amountAtomic = parsePaymentAmount(input.amount, token.decimals);
  const used = await sponsoredUsage(sender.id);
  return {
    recipient: {
      provider: recipient.provider,
      handle: recipient.displayHandle,
    },
    asset: input.asset,
    amount: formatUnits(amountAtomic, token.decimals),
    amountAtomic: amountAtomic.toString(),
    tokenAddress: token.address,
    chainId: activeChain().chainId,
    sponsored: true,
    executionEnabled: paymentExecutionReadiness().ready,
    dailySponsoredRemaining: Math.max(0, DAILY_SPONSORED_PAYMENT_LIMIT - used),
  };
}

export async function createPayment(input: {
  accessToken: string;
  senderUserId: string;
  recipient: string;
  provider?: IdentityProvider;
  asset: PaymentAsset;
  amount: string;
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
  if (existing) return presentPayment(existing);

  const recipient = await resolveRecipient(input.recipient, input.provider);
  if (sender.id === recipient.userId) {
    throw new AppError(400, "SELF_PAYMENT_NOT_ALLOWED", "Choose a different recipient.");
  }
  if (!recipient.walletAddress) {
    throw new AppError(409, "RECIPIENT_WALLET_NOT_READY", "The recipient wallet is not ready.");
  }
  const recipientWallet = recipient.walletAddress;
  const token = tokenFor(input.asset);
  const amountAtomic = parsePaymentAmount(input.amount, token.decimals);
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
    chainId: activeChain().chainId,
    status: "authorized",
    sponsored: true,
    idempotencyKey: input.idempotencyKey,
    chainOperationId: operationId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.batch([
      db.insert(chainOperations).values(
        operationRecord({
          id: operationId,
          userId: sender.id,
          kind: "p2p_payment",
          aggregateId: paymentId,
          walletId: sender.privyWalletId,
          providerRequestId,
          now: new Date(now),
        }),
      ),
      db.insert(payments).values(record),
      db.insert(gasSponsorships).values(
        sponsorshipRecord(operationId, sender.id, new Date(now)),
      ),
    ]);
    await safeAudit({
      actorUserId: sender.id,
      action: "payment.create",
      resourceType: "payment",
      resourceId: paymentId,
      outcome: "accepted",
      metadata: { asset: input.asset, chainId: activeChain().chainId, sponsored: true },
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
    const sent = await sendSponsoredErc20Transfer({
      accessToken: input.accessToken,
      walletId: sender.privyWalletId,
      tokenAddress: token.address,
      recipientAddress: recipientWallet,
      amountAtomic,
      providerRequestId,
    });
    const submittedAt = new Date().toISOString();
    await markOperationSubmitted({
      operationId,
      txHash: sent.txHash,
    });
    await db
      .update(payments)
      .set({
        status: "submitted",
        txHash: sent.txHash,
        submittedAt,
        updatedAt: submittedAt,
      })
      .where(eq(payments.id, paymentId));
    try {
      await createPaymentNotifications(paymentId, sender.id, recipient.userId, input.asset, record.amountDisplay);
    } catch (notificationError) {
      console.error("Payment submitted but notification creation failed", notificationError);
    }
    await safeAudit({
      actorUserId: sender.id,
      action: "payment.submit",
      resourceType: "payment",
      resourceId: paymentId,
      outcome: "succeeded",
      metadata: { asset: input.asset, chainId: activeChain().chainId },
    });
  } catch (error) {
    const classified = classifySubmissionError(error);
    await markOperationSubmissionError({ operationId, ...classified });
    const failedAt = new Date().toISOString();
    await db
      .update(payments)
      .set({
        status: classified.outcome === "definite_failure" ? "failed" : "unknown",
        failureCode: classified.code,
        failureMessage:
          classified.outcome === "definite_failure"
            ? "The transaction was rejected before broadcast."
            : "Submission is being reconciled; do not retry with a new idempotency key.",
        updatedAt: failedAt,
      })
      .where(eq(payments.id, paymentId));
    await safeAudit({
      actorUserId: sender.id,
      action: "payment.submit",
      resourceType: "payment",
      resourceId: paymentId,
      outcome: classified.outcome === "definite_failure" ? "failed" : "unknown",
      metadata: { code: classified.code, asset: input.asset },
    });
    if (classified.outcome === "definite_failure") {
      throw new AppError(
        502,
        "PAYMENT_SUBMISSION_REJECTED",
        "The payment provider rejected the transaction.",
        { paymentId },
      );
    }
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
