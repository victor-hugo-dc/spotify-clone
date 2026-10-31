import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export type Author = { id: string; name: string; image: string | null };

// The author cookie proves a login through this app; /api/token re-checks it with Spotify and re-issues it every hour.
export const authorMaxAge = 2 * 60 * 60 * 1000;

const sign = (data: string) => createHmac("sha256", process.env.CLIENT_SECRET ?? "").update(data).digest();

export function authorCookie(author: Author) {
  const data = Buffer.from(JSON.stringify({ ...author, issued: Date.now() })).toString("base64url");
  return `${data}.${sign(data).toString("base64url")}`;
}

export function readAuthor(cookie: unknown): Author | null {
  if (typeof cookie !== "string") return null;
  const [data = "", signature = ""] = cookie.split(".");
  const given = Buffer.from(signature, "base64url");
  const expected = sign(data);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const { id, name, image, issued } = JSON.parse(Buffer.from(data, "base64url").toString());
  return Date.now() - issued < authorMaxAge ? { id, name, image } : null;
}

// Comments are attributed to the signed-in author, never to an id in the request.
export const requireUser =
  (cookieName: string): RequestHandler =>
  (req, res, next) => {
    const author = readAuthor(req.cookies[cookieName]);
    if (!author) {
      res.sendStatus(401);
      return;
    }
    res.locals.author = author;
    next();
  };
