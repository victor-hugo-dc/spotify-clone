import { Router } from "express";
import { db, isCoverUrl, isOptionalText, isPosition, isSongId, isText } from "../db.ts";
import type { Author } from "../user.ts";

// Remembers who logged in, and which of this Shoutify's other users they follow on Spotify: Spotify can't list whom
// you follow, only say whether you follow given users, 40 at a time. Run at login and at every token refresh, so
// follows are at most an hour old. When Spotify fails, last time's follows stay, and the login goes ahead.
export async function remember(author: Author, access_token: string) {
  db.prepare("INSERT INTO users (id, name, image) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name, image = excluded.image")
    .run(author.id, author.name, author.image);
  try {
    const others = (db.prepare("SELECT id FROM users WHERE id != ?").all(author.id) as { id: string }[]).map((user) => user.id);
    const followed: string[] = [];
    for (let i = 0; i < others.length; i += 40) {
      const chunk = others.slice(i, i + 40);
      const uris = encodeURIComponent(chunk.map((id) => `spotify:user:${id}`).join(","));
      const response = await fetch(`https://api.spotify.com/v1/me/library/contains?uris=${uris}`, { headers: { Authorization: `Bearer ${access_token}` } });
      if (!response.ok) throw new Error(`Spotify /v1/me/library/contains answered ${response.status}`);
      // Booleans, in the order asked.
      const answers = (await response.json()) as unknown[];
      followed.push(...chunk.filter((_, n) => answers[n] === true));
    }
    db.prepare("DELETE FROM follows WHERE follower = ?").run(author.id);
    for (const id of followed) db.prepare("INSERT INTO follows (follower, followee) VALUES (?, ?)").run(author.id, id);
  } catch (error) {
    console.log(error);
  }
}

type Friend = { id: string; name: string; image: string | null; userID: string | null; playing: number | null };

// The people the signed-in user follows, and what they last played (null until they've played something here): first
// those still playing (their song hasn't ended since they said so), then the most recent.
export const friendRoute = Router().get("/", (_req, res) => {
  const author: Author = res.locals.author;
  const friends = db
    .prepare(
      `SELECT users.id, users.name, users.image, activity.* FROM follows JOIN users ON users.id = follows.followee
        LEFT JOIN activity ON activity.userID = users.id WHERE follows.follower = ?
        ORDER BY (activity.playing = 1 AND activity.position + ? - activity.at < activity.duration) DESC, activity.at DESC`,
    )
    .all(author.id, Date.now()) as Friend[];
  res.send({
    friends: friends.map(({ id, name, image, userID, playing, ...activity }) => ({
      id,
      name,
      image,
      activity: userID === null ? null : { ...activity, playing: playing === 1 },
    })),
  });
});

// Album ids go into links to album pages: base 62 only, as Spotify's are.
const isAlbumId = (value: unknown) => value === null || (typeof value === "string" && /^[0-9A-Za-z]{1,22}$/.test(value));

// What the signed-in user's player says they play (Spotify songs only): live, or their last play from Spotify's history
// when they open Shoutify, sent with when (`at`, ms since 1970). The newer report wins, so a late one from history
// can't replace what's playing now.
export const activityRoute = Router().post("/", (req, res) => {
  const { songID, songName, songArtist, songImage, albumID = null, albumName, playing, duration, position, at = Date.now() } = req.body ?? {};
  if (
    !isSongId(songID) ||
    !isText(songName, 300) ||
    !isText(songArtist, 300) ||
    !isCoverUrl(songImage) ||
    !isAlbumId(albumID) ||
    !isOptionalText(albumName, 300) ||
    typeof playing !== "boolean" ||
    !isPosition(duration) ||
    !isPosition(position) ||
    position > duration ||
    !Number.isSafeInteger(at) ||
    at < 0
  ) {
    res.sendStatus(400);
    return;
  }
  const author: Author = res.locals.author;
  // Never later than now, so a client with a fast clock can't keep its next reports out.
  db.prepare(
    `INSERT INTO activity (userID, songID, songName, songArtist, songImage, albumID, albumName, playing, duration, position, at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (userID) DO UPDATE SET songID = excluded.songID, songName = excluded.songName, songArtist = excluded.songArtist,
        songImage = excluded.songImage, albumID = excluded.albumID, albumName = excluded.albumName, playing = excluded.playing,
        duration = excluded.duration, position = excluded.position, at = excluded.at
      WHERE excluded.at >= activity.at`,
  ).run(author.id, songID, songName, songArtist, songImage ?? null, albumID, albumName ?? null, playing ? 1 : 0, duration, position, Math.min(at, Date.now()));
  res.sendStatus(204);
});
