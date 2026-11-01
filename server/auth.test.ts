import { test, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

Object.assign(process.env, { CLIENT_ID: "id", CLIENT_SECRET: "secret", RE_URI: "https://shoutify.test/api/callback", DB_PATH: ":memory:" });
const { app } = await import("./index.ts");

// Spotify, faked: "good" codes and refresh tokens work; "outsider" ones belong to an account not on the allowlist; the
// "busy" refresh token is rotated, and then /v1/me is rate-limited.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input) === "https://api.spotify.com/v1/me") {
    const auth = new Headers(init?.headers).get("authorization");
    if (auth === "Bearer outsider-access") return new Response(null, { status: 403 });
    if (auth === "Bearer busy-access") return new Response(null, { status: 429 });
    return auth === "Bearer access" ? Response.json({ id: "ana", display_name: "Ana", images: [] }) : new Response(null, { status: 401 });
  }
  if (!String(input).startsWith("https://accounts.spotify.com/")) return realFetch(input, init);
  const body = new URLSearchParams(String(init?.body));
  if (body.get("code") === "outsider" || body.get("refresh_token") === "outsider-refresh")
    return Response.json({ access_token: "outsider-access", expires_in: 3600, refresh_token: "r" });
  if (body.get("refresh_token") === "busy-refresh") return Response.json({ access_token: "busy-access", expires_in: 3600, refresh_token: "rotated" });
  return body.get("code") === "good" || body.get("refresh_token") === "good-refresh"
    ? Response.json({ access_token: "access", expires_in: 3600, refresh_token: "good-refresh" })
    : Response.json({ error: "invalid_grant" }, { status: 400 });
};

const server = app.listen(0);
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const get = (path: string, cookie = "") => fetch(base + path, { redirect: "manual", headers: { cookie } });
const cookies = (response: Response) => response.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

test("login sends the browser to Spotify with a state cookie", async () => {
  const response = await get("/api/login");
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.origin + location.pathname, "https://accounts.spotify.com/authorize");
  assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`__Host-spotify_auth_state=${location.searchParams.get("state")};.*Path=/;.*HttpOnly.*Secure.*SameSite=Lax`));
});

test("callback rejects a state that does not match the cookie, and passes Spotify's own errors on", async () => {
  assert.equal((await get("/api/callback?code=good&state=forged", "__Host-spotify_auth_state=real")).headers.get("location"), "/#error=state_mismatch");
  assert.equal((await get("/api/callback?error=access_denied&state=s", "__Host-spotify_auth_state=s")).headers.get("location"), "/#error=access_denied");
});

test("callback keeps tokens out of the URL and signs the user in with httpOnly cookies", async () => {
  const response = await get("/api/callback?code=good&state=s", "__Host-spotify_auth_state=s");
  assert.equal(response.headers.get("location"), "/");
  const set = response.headers.getSetCookie().join("\n");
  assert.match(set, /__Host-refresh_key=good-refresh;.*Path=\/;.*HttpOnly/);
  assert.match(set, /__Host-author=[\w-]+\.[\w-]+;.*HttpOnly/);
});

test("callback turns away accounts that aren't on the allowlist", async () => {
  const response = await get("/api/callback?code=outsider&state=s", "__Host-spotify_auth_state=s");
  assert.equal(response.headers.get("location"), "/#error=not_allowlisted");
  assert.doesNotMatch(response.headers.getSetCookie().join("\n"), /refresh_key=r/);
});

test("token trades the refresh cookie for an uncached access token, and 401s without a valid one", async () => {
  const response = await get("/api/token", "__Host-refresh_key=good-refresh");
  assert.deepEqual(await response.json(), { access_token: "access", expires_in: 3600 });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await get("/api/token")).status, 401);
  assert.equal((await get("/api/token", "__Host-refresh_key=revoked")).status, 401);
});

test("token keeps a rotated refresh token when /v1/me fails, but still signs out accounts off the allowlist", async () => {
  const busy = await get("/api/token", "__Host-refresh_key=busy-refresh");
  assert.equal(busy.status, 502);
  assert.match(busy.headers.getSetCookie().join("\n"), /__Host-refresh_key=rotated;/);
  // Browsers apply Set-Cookie headers in order, so the sign-out has to come after the rotated token.
  const outsider = await get("/api/token", "__Host-refresh_key=outsider-refresh");
  assert.equal(outsider.status, 401);
  assert.match(outsider.headers.getSetCookie().findLast((c) => c.startsWith("__Host-refresh_key=")) ?? "", /^__Host-refresh_key=;/);
});

test("login and logout expire the refresh cookie that used to live at Path=/api", async () => {
  const login = await get("/api/callback?code=good&state=s", "__Host-spotify_auth_state=s");
  const logout = await fetch(`${base}/api/logout`, { method: "POST" });
  for (const response of [login, logout]) assert.match(response.headers.getSetCookie().join("\n"), /^refresh_key=;.*Path=\/api;.*Expires=Thu, 01 Jan 1970/m);
});

test("comments need the signed author cookie, and the author comes from it", async () => {
  const signedIn = cookies(await get("/api/token", "__Host-refresh_key=good-refresh"));
  const add = (cookie: string) =>
    fetch(`${base}/api/comments/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ authorID: "mallory", songID: "4uLU6hMCjMI75M1A2tKUQC", commentBody: "hi", timestamp: 0 }),
    });
  assert.equal((await get("/api/comments/feed")).status, 401);
  assert.equal((await add(signedIn.replace(/\.[\w-]+$/, ".forged"))).status, 401);
  // A valid Spotify token from some other app proves nothing here.
  assert.equal((await fetch(`${base}/api/comments/feed`, { headers: { Authorization: "Bearer access" } })).status, 401);
  const { comment } = (await (await add(signedIn)).json()) as { comment: { authorID: string } };
  assert.equal(comment.authorID, "ana");
});
