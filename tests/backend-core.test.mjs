import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

const { paymentSubmissionSchema } = await vite.ssrLoadModule("/lib/backend/validation.ts");

after(async () => {
  await vite.close();
});

async function migrationSql() {
  const files = (await readdir(path.join(root, "drizzle")))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  assert.ok(files.length >= 1, "expected at least one migration");
  return Promise.all(files.map((file) => readFile(path.join(root, "drizzle", file), "utf8")));
}

async function migratedDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const migrations = await migrationSql();
  for (const sql of migrations) {
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) db.exec(statement);
    }
  }
  return db;
}

test("migration creates the durable backend tables and lookup indexes", async () => {
  const db = await migratedDatabase();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);
  assert.deepEqual(tables, [
    "api_rate_limits",
    "audit_events",
    "chain_operations",
    "contacts",
    "domain_orders",
    "domains",
    "gas_sponsorships",
    "gas_usage",
    "identities",
    "notifications",
    "payment_links",
    "payments",
    "users",
    "webhook_events",
  ]);
  const indexes = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name);
  assert.ok(indexes.includes("identities_verified_lookup_idx"));
  assert.ok(indexes.includes("payments_sender_idempotency_unique"));
  assert.ok(indexes.includes("chain_operations_provider_request_unique"));
  assert.ok(indexes.includes("domain_orders_quote_unique"));
  const userColumns = db.prepare("PRAGMA table_info(users)").all().map((row) => row.name);
  assert.ok(userColumns.includes("free_domain_claimed_at"));
  db.close();
});

test("payment submission accepts only a full transaction hash", () => {
  const payment = { recipient: "kazzy.verse", asset: "VERSE", amount: "50", quoteToken: "a".repeat(64) };
  assert.equal(paymentSubmissionSchema.safeParse({ ...payment, txHash: `0x${"ab".repeat(32)}` }).success, true);
  assert.equal(paymentSubmissionSchema.safeParse({ ...payment, txHash: "0x1234" }).success, false);
});

test("sponsored gas reservation cannot exceed 20 payments per UTC day", async () => {
  const db = await migratedDatabase();
  const now = "2026-09-01T12:00:00.000Z";
  db.prepare(
    "INSERT INTO users (id, privy_user_id, status, created_at, updated_at) VALUES (?, ?, 'active', ?, ?)",
  ).run("user-1", "did:privy:test", now, now);
  const createOperation = db.prepare(
    `INSERT INTO chain_operations
       (id, user_id, kind, aggregate_id, wallet_id, provider_request_id, status, attempt_count, created_at, updated_at)
     VALUES (?, 'user-1', 'p2p_payment', ?, 'wallet-1', ?, 'created', 0, ?, ?)`,
  );
  const reserve = db.prepare(
    `INSERT INTO gas_sponsorships
       (operation_id, user_id, day_key, status, created_at, updated_at)
     VALUES (?, 'user-1', '2026-09-01', 'reserved', ?, ?)`,
  );
  for (let count = 1; count <= 20; count += 1) {
    const id = `operation-${count}`;
    createOperation.run(id, `payment-${count}`, `provider-${count}`, now, now);
    reserve.run(id, now, now);
  }
  createOperation.run("operation-21", "payment-21", "provider-21", now, now);
  assert.throws(() => reserve.run("operation-21", now, now), /DAILY_SPONSORED_LIMIT/);

  db.prepare("UPDATE gas_sponsorships SET status = 'released' WHERE operation_id = 'operation-1'").run();
  reserve.run("operation-21", now, now);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM gas_sponsorships WHERE status != 'released'").get().count,
    20,
  );
  db.close();
});

test("identity rules normalize exact names and reject ambiguous handles", async () => {
  const identity = await vite.ssrLoadModule("/lib/backend/identity-normalization.ts");
  assert.equal(identity.normalizeVerseName("  Alice.VERSE "), "alice");
  assert.equal(identity.normalizeSocialHandle("x", "@Verse_Pay"), "verse_pay");
  assert.deepEqual(identity.normalizeRecipient("alice.verse"), {
    provider: "verse",
    normalized: "alice",
  });
  assert.throws(() => identity.normalizeRecipient("@alice"), /Specify x or telegram/);
  assert.throws(() => identity.normalizeSocialHandle("telegram", "@ab"), /invalid/);
});

test("payment execution is fail-closed and requires user authorization", async () => {
  const [config, privy, route] = await Promise.all([
    readFile(path.join(root, "lib/backend/config.ts"), "utf8"),
    readFile(path.join(root, "lib/backend/privy.ts"), "utf8"),
    readFile(path.join(root, "app/api/payments/route.ts"), "utf8"),
  ]);
  assert.match(config, /\?\? "disabled"/);
  assert.match(privy, /sponsor:\s*paymentsSponsored\(\)/);
  assert.match(privy, /sponsor:\s*registrySponsored\(\)/);
  assert.match(privy, /user_jwts:\s*\[input\.accessToken\]/);
  assert.match(route, /Idempotency-Key header/);
});


test("payment snapshots cannot be forged, cross-used by another sender, or confused with domain quotes", async () => {
  const { signPaymentSnapshot, verifyPaymentSnapshot } = await vite.ssrLoadModule("/lib/backend/payment-quote.ts");
  const payload = { purpose: "verse-payment-v1", senderUserId: "sender", recipient: { walletAddress: "owner-at-quote" }, amountAtomic: "10000" };
  const signed = await signPaymentSnapshot(payload, "test-only-key");
  assert.deepEqual(await verifyPaymentSnapshot(signed, "sender", "test-only-key"), payload);
  await assert.rejects(verifyPaymentSnapshot(signed, "other-sender", "test-only-key"));
  await assert.rejects(verifyPaymentSnapshot(signed, "sender", "wrong-key"));
  await assert.rejects(verifyPaymentSnapshot("x" + signed, "sender", "test-only-key"));
  const wrongPurpose = await signPaymentSnapshot({ ...payload, purpose: "domain" }, "test-only-key");
  await assert.rejects(verifyPaymentSnapshot(wrongPurpose, "sender", "test-only-key"));
});
