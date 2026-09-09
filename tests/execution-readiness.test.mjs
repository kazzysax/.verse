import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, plugins: [{
  name: "test-worker-environment",
  resolveId(id) { if (id === "cloudflare:workers") return "\0test-worker-env"; },
  load(id) { if (id === "\0test-worker-env") return "export const env = {}"; },
}] });
after(() => vite.close());
const { env } = await vite.ssrLoadModule("cloudflare:workers");
const config = await vite.ssrLoadModule("/lib/backend/config.ts");

test("mainnet payments require an explicit confirmation mechanism and approval", () => {
  Object.assign(env, { PRIVY_APP_ID: "test", PRIVY_APP_SECRET: "test", RATE_LIMIT_HASH_SALT: "test", AUDIT_HASH_SALT: "test", POLYGON_RPC_URL: "test", PAYMENTS_EXECUTION_MODE: "mainnet" });
  assert.equal(config.paymentExecutionReadiness().ready, false);
  env.TRANSACTION_CONFIRMATION_MODE = "polling";
  assert.equal(config.paymentExecutionReadiness().ready, false);
  env.MAINNET_ACTIVATION_CONFIRMATION = "VERSE_MAINNET_APPROVED";
  assert.equal(config.paymentExecutionReadiness().ready, true);
});

test("free mint readiness requires registrar signing but not paid-name pricing", () => {
  Object.assign(env, { VERSE_REGISTRY_ADDRESS: "test", VERSE_REGISTRAR_WALLET_ID: "test", VERSE_REGISTRAR_POLICY_ID: "test", REGISTRY_REGISTRAR_ADDRESS: "test" });
  assert.equal(config.registryExecutionReadiness().ready, false);
  env.VERSE_REGISTRAR_AUTHORIZATION_KEY = "test";
  assert.equal(config.registryExecutionReadiness().ready, true);
  assert.equal(env.COINGECKO_API_KEY, undefined);
});


test("confirmation requires the exact token Transfer log, not just a successful receipt", async () => {
  const { hasExpectedTransfer } = await vite.ssrLoadModule("/lib/backend/polygon.ts");
  const { encodeEventTopics, encodeAbiParameters, erc20Abi } = await import("viem");
  const senderAddress = "0x0000000000000000000000000000000000000001";
  const recipientAddress = "0x0000000000000000000000000000000000000002";
  const tokenAddress = "0x0000000000000000000000000000000000000003";
  const input = { senderAddress, recipientAddress, tokenAddress, amountAtomic: 100n };
  const log = { address: tokenAddress, topics: encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from: senderAddress, to: recipientAddress } }), data: encodeAbiParameters([{ type: "uint256" }], [100n]) };
  assert.equal(hasExpectedTransfer([log], input), true);
  assert.equal(hasExpectedTransfer([], input), false);
  assert.equal(hasExpectedTransfer([{ ...log, address: senderAddress }], input), false);
  assert.equal(hasExpectedTransfer([log], { ...input, amountAtomic: 99n }), false);
  assert.equal(hasExpectedTransfer([log], { ...input, recipientAddress: senderAddress }), false);
  assert.equal(hasExpectedTransfer([log], { ...input, senderAddress: recipientAddress }), false);
});
