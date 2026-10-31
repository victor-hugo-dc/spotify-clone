import { test, after } from "node:test";
import assert from "node:assert/strict";
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

test("stores comments and lists them per song and in the feed", async () => {
  assert.equal((await post("/comments/add", { authorID: "someone-else", songID: "s1", commentBody: "great drop", timestamp: 61000 })).status, 201);
  assert.equal((await post("/comments/add", { songID: "s2", commentBody: "meh", timestamp: 0 })).status, 201);

  const song = await get("/comments/song/s1");
  const author = { authorID: "ana", authorName: "Ana", authorImage: null };
  assert.deepEqual(song.comments, [{ id: 1, ...author, songID: "s1", commentBody: "great drop", timestamp: 61000 }]);
  assert.equal((await get("/comments/all")).comments.length, 2);
});

test("rejects comments and annotations with missing or bad fields", async () => {
  assert.equal((await post("/comments/add", { songID: "s1", commentBody: "  ", timestamp: 0 })).status, 400);
  assert.equal((await post("/comments/add", { songID: "s1", commentBody: "hi", timestamp: -5 })).status, 400);
  // SQLite would store this, but reading it back throws, which would break every listing that includes it.
  assert.equal((await post("/comments/add", { songID: "s1", commentBody: "hi", timestamp: 2 ** 60 })).status, 400);
  assert.equal((await post("/annotations/add", { songID: "s1", annotatedText: "a", noteBody: "b", timestamp: 24 * 60 * 60 * 1000 + 1 })).status, 400);
  assert.equal((await post("/annotations/add", { songID: "s1", noteBody: "no line" })).status, 400);
});

test("stores annotations per song", async () => {
  const body = { songID: "s1", annotatedText: "the line", noteBody: "what it means", timestamp: 1000 };
  assert.equal((await post("/annotations/add", body)).status, 201);
  const { annotations } = await get("/annotations/song/s1");
  assert.deepEqual(annotations, [{ id: 1, authorID: "ana", authorName: "Ana", authorImage: null, ...body }]);
});
