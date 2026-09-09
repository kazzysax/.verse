import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { verseApi } = await vite.ssrLoadModule("/lib/client/verse-api.ts");

test("stalled token acquisition expires without making an API request", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected request"); });
  const pending = verseApi("/api/users/bootstrap", () => new Promise(() => {}));
  const rejection = assert.rejects(pending, error => error.code === "AUTH_TIMEOUT");
  t.mock.timers.tick(15000);
  await rejection;
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("authenticated API calls retain server errors and provide an abort signal", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async (_path, options) => {
    assert.equal(options.headers.authorization, "Bearer test-token");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ error: { code: "WALLET_SYNC_PENDING", message: "Wallet syncing" } }, { status: 409 });
  });
  await assert.rejects(verseApi("/api/users/bootstrap", async () => "test-token"), error => error.code === "WALLET_SYNC_PENDING");
  assert.equal(fetchMock.mock.callCount(), 1);
});
