import assert from "node:assert/strict";
import test from "node:test";

test("renders development preview metadata", async () => {
  const layout = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  );
  assert.match(layout, /"codex-preview":\s*"development"/);
});
