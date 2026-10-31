import { test, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

Object.assign(process.env, { CLIENT_ID: "id", CLIENT_SECRET: "secret", RE_URI: "https://shoutify.test/api/callback", DB_PATH: ":memory:" });
const { app } = await import("./index.ts");

// Spotify's token endpoint, faked: "good" codes and refresh tokens work, anything else is rejected.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input) === "https://api.spotify.com/v1/me") {
    const ok = new Headers(init?.headers).get("authorization") === "Bearer access";
    return ok ? Response.json({ id: "ana", display_name: "Ana", images: [] }) : new Response(null, { status: 401 });
  }
  if (!String(input).startsWith("https://accounts.spotify.com/")) return realFetch(input, init);
  const body = new URLSearchParams(String(init?.body));
  return body.get("code") === "good" || body.get("refresh_token") === "good-refresh"
    ? Response.json({ access_token: "access", expires_in: 3600, refresh_token: "good-refresh" })
    : Response.json({ error: "invalid_grant" }, { status: 400 });
};

const server = app.listen(0);
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const get = (path: string, cookie = "") => fetch(base + path, { redirect: "manual", headers: { cookie } });

test("login sends the browser to Spotify with a state cookie", async () => {
  const response = await get("/api/login");
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.origin + location.pathname, "https://accounts.spotify.com/authorize");
  assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`spotify_auth_state=${location.searchParams.get("state")};.*HttpOnly.*Secure.*SameSite=Lax`));
});

test("callback rejects a state that does not match the cookie", async () => {
  const response = await get("/api/callback?code=good&state=forged", "spotify_auth_state=real");
  assert.equal(response.headers.get("location"), "/#error=state_mismatch");
});

test("callback keeps tokens out of the URL and stores the refresh token httpOnly", async () => {
  const response = await get("/api/callback?code=good&state=s", "spotify_auth_state=s");
  assert.equal(response.headers.get("location"), "/");
  assert.match(response.headers.get("set-cookie") ?? "", /refresh_key=good-refresh;.*Path=\/api.*HttpOnly/);
});

test("token trades the refresh cookie for an access token, and 401s without a valid one", async () => {
  assert.deepEqual(await (await get("/api/token", "refresh_key=good-refresh")).json(), { access_token: "access", expires_in: 3600 });
  assert.equal((await get("/api/token")).status, 401);
  assert.equal((await get("/api/token", "refresh_key=revoked")).status, 401);
});

test("comments need a Spotify token, and the author comes from it", async () => {
  const add = (token: string) =>
    fetch(`${base}/api/comments/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ authorID: "mallory", songID: "s1", commentBody: "hi", timestamp: 0 }),
    });
  assert.equal((await get("/api/comments/all")).status, 401);
  assert.equal((await add("stolen")).status, 401);
  const { comment } = (await (await add("access")).json()) as { comment: { authorID: string } };
  assert.equal(comment.authorID, "ana");
});
