import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AddressInfo } from "node:net";
import express from "express";
import type { Author } from "./user.ts";

process.env.DB_PATH = ":memory:";
const { default: comments } = await import("./routes/comments.ts");
const { default: annotations } = await import("./routes/annotations.ts");

// Ana, or whoever the X-User header names, so two people can like the same comment.
const users: Record<string, Author> = { ana: { id: "ana", name: "Ana", image: null }, bo: { id: "bo", name: "Bo", image: null } };
const server = express()
  .use(express.json())
  .use((req, res, next) => ((res.locals.author = users[req.get("X-User") ?? "ana"]), next()))
  .use("/comments", comments)
  .use("/annotations", annotations)
  .listen(0);
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const get = async (path: string, user = "ana"): Promise<any> => (await fetch(base + path, { headers: { "X-User": user } })).json();
const post = (path: string, body: unknown, user = "ana") =>
  fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", "X-User": user }, body: JSON.stringify(body) });

const song1 = "4uLU6hMCjMI75M1A2tKUQC";
const song2 = "7ouMYWpwJ422jRcDASZB7P";
const cover = "https://i.scdn.co/image/ab67616d0000b273e8b066f70c206551210d902b";
const author = { authorID: "ana", authorName: "Ana", authorImage: null };
// A new top-level comment: no replies or likes yet.
const fresh = { parentID: null, likes: 0, liked: false, replies: 0 };

test("stores comments with their song, per song", async () => {
  const withSong = { songID: song1, songName: "Never Gonna Give You Up", songArtist: "Rick Astley", songImage: cover, commentBody: "great drop", timestamp: 61000 };
  const before = Date.now();
  // The server says who wrote it and when.
  const added = await post("/comments/add", { ...withSong, authorID: "someone-else", createdAt: 1 });
  assert.equal(added.status, 201);
  const { comment } = (await added.json()) as { comment: { createdAt: number } };
  assert.ok(comment.createdAt >= before && comment.createdAt <= Date.now(), `createdAt ${comment.createdAt}`);
  const stored = { id: 1, ...author, ...withSong, createdAt: comment.createdAt, ...fresh };
  assert.deepEqual(comment, stored);
  assert.equal((await post("/comments/add", { songID: song2, commentBody: "meh", timestamp: 0 })).status, 201);

  assert.deepEqual((await get(`/comments/song/${song1}`)).comments, [stored]);
  assert.equal((await get(`/comments/song/${song2}`)).comments[0].songName, null);
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

test("likes: one per person, set or cleared however often it's sent, and counted for everyone", async () => {
  const like = async (id: number, liked: unknown, user = "ana") => {
    const response = await post(`/comments/${id}/like`, { liked }, user);
    return response.ok ? response.json() : response.status;
  };
  const mine = async (path: string, user = "ana") =>
    (await get(path, user)).comments.filter((c: { id: number }) => c.id === 1).map(({ likes, liked }: { likes: number; liked: boolean }) => ({ likes, liked }));

  assert.deepEqual(await like(1, true), { likes: 1, liked: true });
  assert.deepEqual(await like(1, true), { likes: 1, liked: true });
  assert.deepEqual(await like(1, true, "bo"), { likes: 2, liked: true });
  assert.deepEqual(await like(1, false), { likes: 1, liked: false });
  assert.deepEqual(await like(1, false), { likes: 1, liked: false });
  // Bo's like counts for Ana, but isn't hers.
  assert.deepEqual(await mine(`/comments/song/${song1}`), [{ likes: 1, liked: false }]);
  assert.deepEqual(await mine(`/comments/song/${song1}`, "bo"), [{ likes: 1, liked: true }]);
  assert.equal(await like(999, true), 404);
  for (const liked of [undefined, null, "true", 1]) assert.equal(await like(1, liked), 400, `liked: ${liked}`);
});

test("replies go one level deep under a comment on the same song, at its moment", async () => {
  // Comment 1 is on song1 at 61000, comment 2 on song2.
  const added = await post("/comments/add", { songID: song1, commentBody: "agreed", parentID: 1 }, "bo");
  assert.equal(added.status, 201);
  assert.partialDeepStrictEqual(await added.json(), {
    comment: { id: 3, authorID: "bo", commentBody: "agreed", timestamp: 61000, parentID: 1, likes: 0, liked: false, replies: 0 },
  });
  // A reply is about its comment's moment, whatever it says.
  const same = await post("/comments/add", { songID: song1, commentBody: "same", parentID: 1, timestamp: 5 });
  assert.partialDeepStrictEqual(await same.json(), { comment: { id: 4, timestamp: 61000 } });
  // Unknown, on another song, a reply itself, or not an id.
  for (const parentID of [999, 2, 3, "1", 1.5]) {
    assert.equal((await post("/comments/add", { songID: song1, commentBody: "hi", timestamp: 0, parentID })).status, 400, `parentID: ${parentID}`);
  }

  const song = (await get(`/comments/song/${song1}`)).comments;
  assert.deepEqual(song.map(({ id, parentID, replies }: { id: number; parentID: number | null; replies: number }) => [id, parentID, replies]), [[1, null, 2], [3, 1, 0], [4, 1, 0]]);
  // A song's comment count takes in the replies.
  assert.deepEqual(await get(`/comments/counts?songs=${song1}`), { counts: { [song1]: 3 } });
});

test("adds the song, posting-time and reply columns, and when people last looked, to a database made before they existed", async () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "shoutify-")), "old.db");
  new DatabaseSync(file).exec(`CREATE TABLE comments (id INTEGER PRIMARY KEY, authorID TEXT NOT NULL, authorName TEXT NOT NULL,
    authorImage TEXT, songID TEXT NOT NULL, commentBody TEXT NOT NULL, timestamp INTEGER NOT NULL);
    INSERT INTO comments (authorID, authorName, songID, commentBody, timestamp) VALUES ('bo', 'Bo', '${song1}', 'old one', 5);
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, image TEXT); INSERT INTO users (id, name) VALUES ('bo', 'Bo')`);
  process.env.DB_PATH = file;
  // A query string loads db.ts again as a separate module, so it opens this file.
  const fresh: string = "./db.ts?old-database";
  const { db } = await import(fresh);
  assert.deepEqual({ ...db.prepare("SELECT songName, createdAt, parentID, commentBody FROM comments").get() }, { songName: null, createdAt: null, parentID: null, commentBody: "old one" });
  assert.ok(db.prepare("SELECT 1 FROM pragma_index_list('comments') WHERE name = 'comments_parent'").get(), "no index on parentID");
  assert.deepEqual({ ...db.prepare("SELECT name, seenAt FROM users").get() }, { name: "Bo", seenAt: null });
});
