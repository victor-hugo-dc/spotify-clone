import type { RequestHandler } from "express";

export type Author = { id: string; name: string; image: string | null };

// One /v1/me call per access token (they last an hour), not one per request.
const seen = new Map<string, { author: Author; expires: number }>();

// Comments are attributed to whoever Spotify says the caller's token belongs to, never to an id in the body.
export const requireUser: RequestHandler = async (req, res, next) => {
  const token = req.get("authorization")?.replace(/^Bearer /, "");
  if (!token) {
    res.sendStatus(401);
    return;
  }
  const now = Date.now();
  let hit = seen.get(token);
  if (!hit || hit.expires < now) {
    const response = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      // 401: bad or expired token; 403: an account the Spotify app hasn't allowlisted.
      res.sendStatus(response.status === 401 || response.status === 403 ? response.status : 502);
      return;
    }
    const me = (await response.json()) as { id: string; display_name: string | null; images?: { url: string }[] };
    for (const [key, value] of seen) if (value.expires < now) seen.delete(key);
    hit = { author: { id: me.id, name: me.display_name ?? me.id, image: me.images?.[0]?.url ?? null }, expires: now + 60 * 60 * 1000 };
    seen.set(token, hit);
  }
  res.locals.author = hit.author;
  next();
};
