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

after(async () => {
  await vite.close();
});

async function migrationSql() {
  const files = (await readdir(path.join(root, "drizzle")))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  assert.equal(files.length, 1, "expected one initial migration");
  return readFile(path.join(root, "drizzle", files[0]), "utf8");
}

async function migratedDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const sql = await migrationSql();
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
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
    "contacts",
    "domains",
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
  assert.ok(indexes.includes("gas_usage_user_day_unique"));
  db.close();
});

test("sponsored gas reservation cannot exceed 20 payments per UTC day", async () => {
  const db = await migratedDatabase();
  const now = "2026-09-01T12:00:00.000Z";
  db.prepare(
    "INSERT INTO users (id, privy_user_id, status, created_at, updated_at) VALUES (?, ?, 'active', ?, ?)",
  ).run("user-1", "did:privy:test", now, now);
  const reserve = db.prepare(
    `INSERT INTO gas_usage (id, user_id, day_key, count, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(user_id, day_key) DO UPDATE SET
       count = count + 1,
       updated_at = excluded.updated_at
     WHERE gas_usage.count < ?
     RETURNING count`,
  );
  for (let count = 1; count <= 20; count += 1) {
    const row = reserve.get(`usage-${count}`, "user-1", "2026-09-01", now, now, 20);
    assert.equal(row.count, count);
  }
  assert.equal(reserve.get("usage-21", "user-1", "2026-09-01", now, now, 20), undefined);
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
  assert.match(privy, /sponsor:\s*true/);
  assert.match(privy, /user_jwts:\s*\[input\.accessToken\]/);
  assert.match(route, /Idempotency-Key header/);
});
