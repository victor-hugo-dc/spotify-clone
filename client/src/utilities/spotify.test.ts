import { test } from "node:test";
import assert from "node:assert/strict";
import { allPages, playerCommand, spotify } from "./spotify.ts";

// Answers Spotify with `status`/`body`; Shoutify's /api/token always hands out "tok".
function answer(status: number, body = "") {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    if (url === "/api/token") return Response.json({ access_token: "tok", expires_in: 3600 });
    calls.push({ url, init });
    if (init.signal?.aborted) throw new DOMException("aborted", "AbortError");
    return new Response(body || null, { status });
  }) as typeof fetch;
  return calls;
}

test("prefixes /v1, sends the token and parses JSON", async () => {
  const calls = answer(200, '{"id":"me"}');
  assert.deepEqual(await spotify("/me"), { id: "me" });
  assert.equal(calls[0]?.url, "https://api.spotify.com/v1/me");
  assert.deepEqual(calls[0]?.init.headers, { Authorization: "Bearer tok" });
});

test("returns undefined for 204 player commands and sends JSON bodies", async () => {
  const calls = answer(204);
  assert.equal(await spotify("/me/player/play", { method: "PUT", body: { uris: ["x"] } }), undefined);
  assert.equal(calls[0]?.init.body, '{"uris":["x"]}');
});

test("doesn't choke on non-JSON bodies", async () => {
  answer(200, "OK");
  assert.equal(await spotify("/me/player/play", { method: "PUT" }), undefined);
  answer(502, "upstream connect error or disconnect/reset before headers");
  await assert.rejects(spotify("/me/player/play", { method: "PUT" }), (error: Error & { status?: number }) =>
    error.status === 502 && error.message === "Spotify is having trouble (502), try again");
});

test("throws Spotify's error message", async () => {
  answer(403, '{"error":{"status":403,"message":"Player command failed: Premium required"}}');
  await assert.rejects(spotify("/me/player/play", { method: "PUT" }), /Premium required/);
});

test("a cancelled request never settles", async () => {
  answer(200, "{}");
  const controller = new AbortController();
  controller.abort();
  const result = await Promise.race([
    spotify("/me", { signal: controller.signal }).then(() => "settled", () => "settled"),
    new Promise((resolve) => setTimeout(() => resolve("pending"), 50)),
  ]);
  assert.equal(result, "pending");
});

test("player commands retry on this browser's device when none is active", async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    if (url === "/api/token") return Response.json({ access_token: "tok", expires_in: 3600 });
    calls.push(url);
    return url.includes("device_id=") ? new Response(null, { status: 204 }) : Response.json({ error: { status: 404, message: "No active device found" } }, { status: 404 });
  }) as typeof fetch;
  await playerCommand("/me/player/play", "dev-1", { method: "PUT" });
  assert.deepEqual(calls, ["https://api.spotify.com/v1/me/player/play", "https://api.spotify.com/v1/me/player/play?device_id=dev-1"]);
  await assert.rejects(playerCommand("/me/player/play", null, { method: "PUT" }), (error: Error & { status?: number }) => error.status === 404);
});

test("allPages follows next links, unwraps nested pages and drops nulls", async () => {
  const pages: Record<string, unknown> = {
    "https://api.spotify.com/v1/me/following?type=artist": { artists: { items: ["a", null], next: "https://api.spotify.com/v1/me/following?after=a" } },
    "https://api.spotify.com/v1/me/following?after=a": { artists: { items: ["b"], next: null } },
  };
  globalThis.fetch = (async (url: string) => Response.json(url === "/api/token" ? { access_token: "tok", expires_in: 3600 } : pages[url])) as typeof fetch;
  assert.deepEqual(await allPages("/me/following?type=artist", (data) => data.artists), ["a", "b"]);
});

test("a 401 gets one retry with a freshly refreshed token", async () => {
  let issued = 0;
  const seen: (string | null)[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    if (url === "/api/token") return Response.json({ access_token: `tok-${++issued}`, expires_in: 3600 });
    const auth = new Headers(init.headers).get("authorization");
    seen.push(auth);
    return auth === `Bearer tok-${issued}` && issued > 1 ? Response.json({ id: "me" }) : new Response(null, { status: 401 });
  }) as typeof fetch;
  // Force the first lookup to refresh, as after an expired session.
  const { refreshSession } = await import("./session.ts");
  await refreshSession();
  assert.deepEqual(await spotify("/me"), { id: "me" });
  assert.deepEqual(seen, ["Bearer tok-1", "Bearer tok-2"]);
});
