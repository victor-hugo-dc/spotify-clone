import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AddressInfo } from "node:net";
import express from "express";

process.env.DB_PATH = ":memory:";
const { default: comments } = await import("./routes/comments.ts");
const { default: annotations } = await import("./routes/annotations.ts");

const ana = { id: "ana", name: "Ana", image: null };
const server = express()
  .use(express.json())
  .use((_req, res, next) => ((res.locals.author = ana), next()))
  .use("/comments", comments)
  .use("/annotations", annotations)
  .listen(0);
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const get = async (path: string): Promise<any> => (await fetch(base + path)).json();
const post = (path: string, body: unknown) =>
  fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const song1 = "4uLU6hMCjMI75M1A2tKUQC";
const song2 = "7ouMYWpwJ422jRcDASZB7P";
const cover = "https://i.scdn.co/image/ab67616d0000b273e8b066f70c206551210d902b";
const author = { authorID: "ana", authorName: "Ana", authorImage: null };

test("stores comments with their song, per song and in the feed (newest first)", async () => {
  const withSong = { songID: song1, songName: "Never Gonna Give You Up", songArtist: "Rick Astley", songImage: cover, commentBody: "great drop", timestamp: 61000 };
  const before = Date.now();
  // The server says who wrote it and when.
  const added = await post("/comments/add", { ...withSong, authorID: "someone-else", createdAt: 1 });
  assert.equal(added.status, 201);
  const { comment } = (await added.json()) as { comment: { createdAt: number } };
  assert.ok(comment.createdAt >= before && comment.createdAt <= Date.now(), `createdAt ${comment.createdAt}`);
  assert.equal((await post("/comments/add", { songID: song2, commentBody: "meh", timestamp: 0 })).status, 201);

  assert.deepEqual((await get(`/comments/song/${song1}`)).comments, [{ id: 1, ...author, ...withSong, createdAt: comment.createdAt }]);
  const feed = (await get("/comments/all")).comments;
  assert.deepEqual(feed.map((c: { id: number }) => c.id), [2, 1]);
  assert.equal(feed[0].songName, null);
  assert.equal(feed[1].createdAt, comment.createdAt);
});

test("counts comments for a batch of songs in one request", async () => {
  assert.deepEqual(await get(`/comments/counts?songs=${song1},${song2},0000000000000000000000`), { counts: { [song1]: 1, [song2]: 1 } });
  assert.equal((await fetch(`${base}/comments/counts?songs=${Array(101).fill(song1)}`)).status, 400);
  assert.equal((await fetch(`${base}/comments/counts?songs=not-an-id`)).status, 400);
});

test("rejects comments and annotations with missing or bad fields", async () => {
  assert.equal((await post("/comments/add", { songID: song1, commentBody: "  ", timestamp: 0 })).status, 400);
  assert.equal((await post("/comments/add", { songID: song1, commentBody: "hi", timestamp: -5 })).status, 400);
  assert.equal((await post("/comments/add", { songID: "s1", commentBody: "hi", timestamp: 0 })).status, 400);
  // Covers only from Spotify's CDN, so a comment can't make everyone load an arbitrary image.
  assert.equal((await post("/comments/add", { songID: song1, songImage: "https://tracker.example/pixel.gif", commentBody: "hi", timestamp: 0 })).status, 400);
  // SQLite would store this, but reading it back throws, which would break every listing that includes it.
  assert.equal((await post("/comments/add", { songID: song1, commentBody: "hi", timestamp: 2 ** 60 })).status, 400);
  assert.equal((await post("/annotations/add", { songID: song1, annotatedText: "a", noteBody: "b", timestamp: 24 * 60 * 60 * 1000 + 1 })).status, 400);
  assert.equal((await post("/annotations/add", { songID: song1, noteBody: "no line" })).status, 400);
});

test("stores annotations per song", async () => {
  const body = { songID: song1, annotatedText: "the line", noteBody: "what it means", timestamp: 1000 };
  assert.equal((await post("/annotations/add", body)).status, 201);
  const { annotations } = await get(`/annotations/song/${song1}`);
  assert.deepEqual(annotations, [{ id: 1, ...author, ...body }]);
});

test("adds the song and posting-time columns to a database made before they existed", async () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "shoutify-")), "old.db");
  new DatabaseSync(file).exec(`CREATE TABLE comments (id INTEGER PRIMARY KEY, authorID TEXT NOT NULL, authorName TEXT NOT NULL,
    authorImage TEXT, songID TEXT NOT NULL, commentBody TEXT NOT NULL, timestamp INTEGER NOT NULL);
    INSERT INTO comments (authorID, authorName, songID, commentBody, timestamp) VALUES ('bo', 'Bo', '${song1}', 'old one', 5)`);
  process.env.DB_PATH = file;
  // A query string loads db.ts again as a separate module, so it opens this file.
  const fresh: string = "./db.ts?old-database";
  const { db } = await import(fresh);
  assert.deepEqual({ ...db.prepare("SELECT songName, createdAt, commentBody FROM comments").get() }, { songName: null, createdAt: null, commentBody: "old one" });
});
