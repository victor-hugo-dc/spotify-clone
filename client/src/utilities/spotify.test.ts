import { test } from "node:test";
import assert from "node:assert/strict";
import { spotify } from "./spotify.ts";

function answer(status: number, body = "") {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (init.signal?.aborted) throw new DOMException("aborted", "AbortError");
    return new Response(body || null, { status });
  }) as typeof fetch;
  return calls;
}

test("prefixes /v1, sends the token and parses JSON", async () => {
  const calls = answer(200, '{"id":"me"}');
  assert.deepEqual(await spotify("/me", "tok"), { id: "me" });
  assert.equal(calls[0]?.url, "https://api.spotify.com/v1/me");
  assert.deepEqual(calls[0]?.init.headers, { Authorization: "Bearer tok" });
});

test("returns undefined for 204 player commands and sends JSON bodies", async () => {
  const calls = answer(204);
  assert.equal(await spotify("/me/player/play", "tok", { method: "PUT", body: { uris: ["x"] } }), undefined);
  assert.equal(calls[0]?.init.body, '{"uris":["x"]}');
});

test("throws Spotify's error message", async () => {
  answer(403, '{"error":{"status":403,"message":"Player command failed: Premium required"}}');
  await assert.rejects(spotify("/me/player/play", "tok", { method: "PUT" }), /Premium required/);
});

test("a cancelled request never settles", async () => {
  answer(200, "{}");
  const controller = new AbortController();
  controller.abort();
  const result = await Promise.race([
    spotify("/me", "tok", { signal: controller.signal }).then(() => "settled", () => "settled"),
    new Promise((resolve) => setTimeout(() => resolve("pending"), 50)),
  ]);
  assert.equal(result, "pending");
});
