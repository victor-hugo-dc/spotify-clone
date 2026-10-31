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

export const isText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim() !== "" && value.length <= max;

// Song positions in milliseconds, up to a day. Integers past 2^53 would be stored but couldn't be read back.
export const isPosition = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 24 * 60 * 60 * 1000;
