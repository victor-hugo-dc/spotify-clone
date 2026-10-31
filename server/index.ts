import path from "node:path";
import { randomBytes } from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import type { CookieOptions } from "express";
import commentRoute from "./routes/comments.ts";
import noteRoute from "./routes/annotations.ts";
import { authorCookie, authorMaxAge, requireUser, type Author } from "./user.ts";

const {
  CLIENT_ID = "",
  CLIENT_SECRET = "",
  RE_URI = "",
  PORT = "4000",
} = process.env;
if (!CLIENT_ID || !CLIENT_SECRET || !RE_URI) throw new Error("Set CLIENT_ID, CLIENT_SECRET and RE_URI (see .env.example)");

export const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Secure cookies need HTTPS; local development runs on http://127.0.0.1. Over HTTPS the __Host- prefix also stops
// sibling *.torta-server.duckdns.org sites from planting these cookies.
const secure = RE_URI.startsWith("https://");
const cookieName = (name: string) => (secure ? `__Host-${name}` : name);
const stateKey = cookieName("spotify_auth_state");
const refreshKey = cookieName("refresh_key");
const authorKey = cookieName("author");
const cookieOption: CookieOptions = { httpOnly: true, sameSite: "lax", secure, path: "/" };
const year = 365 * 24 * 60 * 60 * 1000;

// Only logged-in friends can read or write comments and annotations.
app.use("/api/comments", requireUser(authorKey), commentRoute);
app.use("/api/annotations", requireUser(authorKey), noteRoute);

const scope =
  "user-read-private user-read-playback-state streaming user-modify-playback-state playlist-modify-public user-library-modify user-top-read user-read-currently-playing playlist-read-private user-follow-read user-read-recently-played playlist-modify-private user-follow-modify user-library-read user-read-email";

// In production the server also hands out the built client; any non-API path is a client-side route.
if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(import.meta.dirname, "..", "dist");
  app.use(express.static(dist));
  app.get(/^\/(?!api\/)/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

// Both the code exchange and the refresh go to the same Spotify endpoint. Errors carry Spotify's status.
async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64") },
    body: new URLSearchParams(params),
  });
  const data = (await response.json()) as TokenResponse & { error?: string; error_description?: string };
  if (!response.ok) throw Object.assign(new Error(data.error_description ?? data.error ?? response.statusText), { code: data.error });
  return data;
}

// Who a fresh access token belongs to; null for accounts the Spotify app hasn't allowlisted (Spotify answers 403).
async function whoIs(access_token: string): Promise<Author | null> {
  const response = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${access_token}` } });
  if (response.status === 403) return null;
  if (!response.ok) throw new Error(`Spotify /v1/me answered ${response.status}`);
  const me = (await response.json()) as { id: string; display_name: string | null; images?: { url: string }[] };
  return { id: me.id, name: me.display_name ?? me.id, image: me.images?.[0]?.url ?? null };
}

// Store a random state in a cookie (checked in /callback against CSRF) and send the user to Spotify's login page.
app.get("/api/login", (_req, res) => {
  const state = randomBytes(16).toString("hex");
  res.cookie(stateKey, state, { ...cookieOption, maxAge: 10 * 60 * 1000 });

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope,
    redirect_uri: RE_URI,
    state,
    show_dialog: "true",
  }).toString();
  res.redirect(authUrl.toString());
});

// The refresh token stays in an httpOnly cookie; the browser only ever sees short-lived access tokens from /api/token.
app.get("/api/callback", async (req, res) => {
  const { code, state, error } = req.query;
  // e.g. access_denied when the user cancels Spotify's consent screen
  if (typeof error === "string") {
    res.redirect(`/#${new URLSearchParams({ error })}`);
    return;
  }
  if (typeof code !== "string" || typeof state !== "string" || state !== req.cookies[stateKey]) {
    res.redirect(`/#${new URLSearchParams({ error: "state_mismatch" })}`);
    return;
  }
  res.clearCookie(stateKey, cookieOption);

  try {
    const { access_token, refresh_token = "" } = await requestToken({
      code,
      redirect_uri: RE_URI,
      grant_type: "authorization_code",
    });
    const author = await whoIs(access_token);
    if (!author) {
      res.redirect(`/#${new URLSearchParams({ error: "not_allowlisted" })}`);
      return;
    }
    res.cookie(refreshKey, refresh_token, { ...cookieOption, maxAge: year });
    res.cookie(authorKey, authorCookie(author), { ...cookieOption, maxAge: authorMaxAge });
    clearOldRefreshCookie(res);
    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.redirect(`/#${new URLSearchParams({ error: "invalid_token" })}`);
  }
});

app.get("/api/token", async (req, res) => {
  const refresh_token = req.cookies[refreshKey];
  if (!refresh_token) {
    res.sendStatus(401);
    return;
  }
  res.set("Cache-Control", "no-store");
  try {
    const { access_token, expires_in, refresh_token: rotated } = await requestToken({ grant_type: "refresh_token", refresh_token });
    // Saved before /v1/me can fail: Spotify may have revoked the old one. A sign-out below still wins, as it comes later.
    if (rotated) res.cookie(refreshKey, rotated, { ...cookieOption, maxAge: year });
    // Re-checked every hour, so someone taken off the allowlist loses access within one.
    const author = await whoIs(access_token);
    if (!author) {
      logout(res);
      res.sendStatus(401);
      return;
    }
    res.cookie(authorKey, authorCookie(author), { ...cookieOption, maxAge: authorMaxAge });
    res.send({ access_token, expires_in });
  } catch (error) {
    // invalid_grant: the refresh token was revoked or expired, so log out. Anything else is worth retrying.
    if ((error as { code?: string }).code === "invalid_grant") {
      logout(res);
      res.sendStatus(401);
    } else {
      console.log(error);
      res.sendStatus(502);
    }
  }
});

function logout(res: express.Response) {
  res.clearCookie(refreshKey, cookieOption);
  res.clearCookie(authorKey, cookieOption);
  clearOldRefreshCookie(res);
}

// The refresh token used to live in refresh_key at Path=/api: over http that cookie shadows ours, over https it lingers.
function clearOldRefreshCookie(res: express.Response) {
  res.clearCookie("refresh_key", { ...cookieOption, path: "/api" });
}

app.post("/api/logout", (_req, res) => {
  logout(res);
  res.sendStatus(204);
});

if (import.meta.main) app.listen(Number(PORT), () => console.log(`Listening on port ${PORT}`));
