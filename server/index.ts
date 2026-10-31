import path from "node:path";
import { randomBytes } from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import type { CookieOptions } from "express";
import cors from "cors";
import mongoose from "mongoose";
import commentRoute from "./routes/comments.ts";
import noteRoute from "./routes/annotations.ts";

const {
  CLIENT_ID = "",
  CLIENT_SECRET = "",
  FRONT_URI = "",
  RE_URI = "",
  MY_MONGO_URI = "",
  PORT = "4000",
} = process.env;

mongoose
  .connect(MY_MONGO_URI)
  .then((x) => console.log(`Connected to Mongo! Database name: "${x.connections[0]?.name}"`))
  .catch((err) => console.error("Error connecting to mongo", err));

const app = express();

app.use(cookieParser());
app.use(cors({ origin: FRONT_URI, credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/comments", commentRoute);
app.use("/annotations", noteRoute);

const stateKey = "spotify_auth_state";
const refreshKey = "refresh_key";
const cookieOption: CookieOptions = {
  // Comment out the following 2 lines while in development for the authorization flow to work properly
  sameSite: "none",
  secure: true,
};

const scope =
  "user-read-private user-read-playback-state streaming user-modify-playback-state playlist-modify-public user-library-modify user-top-read user-read-currently-playing playlist-read-private user-follow-read user-read-recently-played playlist-modify-private user-follow-modify user-library-read user-read-email";

if (process.env.NODE_ENV === "production") {
  const build = path.resolve(import.meta.dirname, "..", "client", "build");
  app.use(express.static(build));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(build, "index.html")));
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

// Both the code exchange and the refresh go to the same Spotify endpoint.
async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64") },
    body: new URLSearchParams(params),
  });
  const data = (await response.json()) as TokenResponse & { error?: string; error_description?: string };
  if (!response.ok) throw new Error(data.error_description ?? data.error ?? response.statusText);
  return data;
}

// Store a random state in a cookie (checked in /callback against CSRF) and send the user to Spotify's login page.
app.get("/login", (_req, res) => {
  const state = randomBytes(16).toString("hex");
  res.cookie(stateKey, state);

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

app.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  if (typeof code !== "string" || typeof state !== "string" || state !== req.cookies[stateKey]) {
    res.redirect(`${FRONT_URI}/#${new URLSearchParams({ error: "state_mismatch" })}`);
    return;
  }
  res.clearCookie(stateKey);

  try {
    const { access_token, refresh_token = "" } = await requestToken({
      code,
      redirect_uri: RE_URI,
      grant_type: "authorization_code",
    });
    res.cookie(refreshKey, refresh_token, cookieOption);
    res.redirect(`${FRONT_URI}/#${new URLSearchParams({ access_token, refresh_token })}`);
  } catch (error) {
    console.log(error);
    res.redirect(`${FRONT_URI}/#${new URLSearchParams({ error: "invalid_token" })}`);
  }
});

app.get("/refresh_token", async (req, res) => {
  try {
    const { access_token, refresh_token } = await requestToken({
      grant_type: "refresh_token",
      refresh_token: req.cookies[refreshKey] ?? "",
    });
    // Spotify sometimes rotates the refresh token.
    if (refresh_token) res.cookie(refreshKey, refresh_token, cookieOption);
    res.send({ access_token });
  } catch (error) {
    res.status(400).send(String(error));
  }
});

app.get("/logout", (_req, res) => {
  res.clearCookie(refreshKey, cookieOption);
  res.status(200).send("logged out");
});

app.listen(Number(PORT), () => console.log(`Listening on port ${PORT}`));
