import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// A single SQLite file is plenty here: Spotify caps a Development Mode app at five users.
const file = process.env.DB_PATH ?? "data/shoutify.db";
if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    authorID TEXT NOT NULL,
    authorName TEXT NOT NULL,
    authorImage TEXT,
    songID TEXT NOT NULL,
    commentBody TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS comments_song ON comments (songID);
  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY,
    authorID TEXT NOT NULL,
    authorName TEXT NOT NULL,
    authorImage TEXT,
    songID TEXT NOT NULL,
    annotatedText TEXT NOT NULL,
    noteBody TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS annotations_song ON annotations (songID);
`);

// Comments carry their song's name, artist and cover so the feed needs no Spotify lookups, and when they were posted
// (ms since 1970; NULL on comments saved before that was kept). Older databases (and new ones, from the table above)
// get those columns here.
for (const [column, type] of Object.entries({ songName: "TEXT", songArtist: "TEXT", songImage: "TEXT", createdAt: "INTEGER" })) {
  if (!db.prepare("SELECT 1 FROM pragma_table_info('comments') WHERE name = ?").get(column)) {
    db.exec(`ALTER TABLE comments ADD COLUMN ${column} ${type}`);
  }
}

export const isText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim() !== "" && value.length <= max;

// Song positions in milliseconds, up to a day. Integers past 2^53 would be stored but couldn't be read back.
export const isPosition = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 24 * 60 * 60 * 1000;

// Optional text: missing, or text within `max`.
export const isOptionalText = (value: unknown, max: number) => value === undefined || value === null || isText(value, max);

// Spotify track ids are 22 base-62 characters.
export const isSongId = (value: unknown): value is string => typeof value === "string" && /^[0-9A-Za-z]{22}$/.test(value);

// Cover art only from Spotify's image CDN, so a comment can't make everyone's browser load some other server's image.
export const isCoverUrl = (value: unknown) => value === undefined || value === null || (typeof value === "string" && /^https:\/\/i\.scdn\.co\/image\/[0-9a-f]{40}$/.test(value));
