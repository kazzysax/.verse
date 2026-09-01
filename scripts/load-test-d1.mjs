import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
for (const file of readdirSync(path.join(root, "drizzle")).filter((name) => name.endsWith(".sql")).sort()) {
  const sql = readFileSync(path.join(root, "drizzle", file), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
}

const users = 1_000;
const paymentsPerUser = 20;
const now = "2026-09-01T12:00:00.000Z";
const dayKey = "2026-09-01";
const insertUser = db.prepare(
  `INSERT INTO users
    (id, privy_user_id, email, status, privy_wallet_id, wallet_address, free_domain_claimed_at, created_at, updated_at)
   VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
);
const insertIdentity = db.prepare(
  `INSERT INTO identities
    (id, user_id, provider, normalized_handle, display_handle, provider_subject, verified, verified_at, created_at, updated_at)
   VALUES (?, ?, 'x', ?, ?, ?, 1, ?, ?, ?)`,
);
const insertDomain = db.prepare(
  `INSERT INTO domains
    (id, name, owner_user_id, owner_wallet_address, token_id, status, is_primary, acquired_kind, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, 'active', 1, 'free', ?, ?)`,
);
const insertOperation = db.prepare(
  `INSERT INTO chain_operations
    (id, user_id, kind, aggregate_id, wallet_id, provider_request_id, status, attempt_count, created_at, submitted_at, confirmed_at, updated_at)
   VALUES (?, ?, 'p2p_payment', ?, ?, ?, 'confirmed', 1, ?, ?, ?, ?)`,
);
const insertPayment = db.prepare(
  `INSERT INTO payments
    (id, sender_user_id, recipient_user_id, recipient_display, from_wallet, to_wallet, asset, token_address,
     amount_atomic, amount_display, chain_id, status, sponsored, idempotency_key, chain_operation_id,
     created_at, submitted_at, confirmed_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, 'USDC', '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
     '1000000', '1', 137, 'confirmed', 1, ?, ?, ?, ?, ?, ?)`,
);
const insertSponsorship = db.prepare(
  `INSERT INTO gas_sponsorships
    (operation_id, user_id, day_key, status, created_at, updated_at)
   VALUES (?, ?, ?, 'consumed', ?, ?)`,
);

const writeStarted = performance.now();
db.exec("BEGIN IMMEDIATE");
try {
  for (let userNumber = 0; userNumber < users; userNumber += 1) {
    const userId = `user-${userNumber}`;
    const walletId = `wallet-${userNumber}`;
    const address = `0x${userNumber.toString(16).padStart(40, "0")}`;
    insertUser.run(
      userId,
      `did:privy:load:${userNumber}`,
      `user${userNumber}@example.test`,
      walletId,
      address,
      now,
      now,
      now,
    );
    insertIdentity.run(
      `identity-${userNumber}`,
      userId,
      `handle_${userNumber}`,
      `@handle_${userNumber}`,
      `subject-${userNumber}`,
      now,
      now,
      now,
    );
    insertDomain.run(
      `domain-${userNumber}`,
      `user-${userNumber}`,
      userId,
      address,
      String(userNumber + 1),
      now,
      now,
    );
  }
  for (let userNumber = 0; userNumber < users; userNumber += 1) {
    const senderId = `user-${userNumber}`;
    const recipientNumber = (userNumber + 1) % users;
    const recipientId = `user-${recipientNumber}`;
    const fromWallet = `0x${userNumber.toString(16).padStart(40, "0")}`;
    const toWallet = `0x${recipientNumber.toString(16).padStart(40, "0")}`;
    for (let paymentNumber = 0; paymentNumber < paymentsPerUser; paymentNumber += 1) {
      const paymentId = `payment-${userNumber}-${paymentNumber}`;
      const operationId = `operation-${userNumber}-${paymentNumber}`;
      insertOperation.run(
        operationId,
        senderId,
        paymentId,
        `wallet-${userNumber}`,
        `provider-${userNumber}-${paymentNumber}`,
        now,
        now,
        now,
        now,
      );
      insertPayment.run(
        paymentId,
        senderId,
        recipientId,
        `user-${recipientNumber}.verse`,
        fromWallet,
        toWallet,
        `idempotency-${userNumber}-${paymentNumber}`,
        operationId,
        now,
        now,
        now,
        now,
      );
      insertSponsorship.run(operationId, senderId, dayKey, now, now);
    }
  }
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}
const writeMs = performance.now() - writeStarted;

const identityLookup = db.prepare(
  `SELECT users.id, users.wallet_address
   FROM identities JOIN users ON identities.user_id = users.id
   WHERE identities.provider = 'x' AND identities.verified = 1 AND identities.normalized_handle = ?
   LIMIT 1`,
);
const paymentHistory = db.prepare(
  `SELECT id, status, amount_display
   FROM payments
   WHERE sender_user_id = ? OR recipient_user_id = ?
   ORDER BY created_at DESC LIMIT 25`,
);
const readStarted = performance.now();
for (let userNumber = 0; userNumber < users; userNumber += 1) {
  assert.equal(identityLookup.get(`handle_${userNumber}`).id, `user-${userNumber}`);
  assert.ok(paymentHistory.all(`user-${userNumber}`, `user-${userNumber}`).length > 0);
}
const readMs = performance.now() - readStarted;

const counts = {
  users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
  identities: db.prepare("SELECT COUNT(*) AS count FROM identities").get().count,
  domains: db.prepare("SELECT COUNT(*) AS count FROM domains").get().count,
  payments: db.prepare("SELECT COUNT(*) AS count FROM payments").get().count,
  operations: db.prepare("SELECT COUNT(*) AS count FROM chain_operations").get().count,
  sponsorships: db.prepare("SELECT COUNT(*) AS count FROM gas_sponsorships").get().count,
};
assert.deepEqual(counts, {
  users: 1_000,
  identities: 1_000,
  domains: 1_000,
  payments: 20_000,
  operations: 20_000,
  sponsorships: 20_000,
});
process.stdout.write(`${JSON.stringify({ counts, writeMs: Math.round(writeMs), readMs: Math.round(readMs) })}\n`);
db.close();
