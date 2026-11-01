import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import type { Author } from "./user.ts";

process.env.DB_PATH = ":memory:";
const { db } = await import("./db.ts");
const { default: comments } = await import("./routes/comments.ts");
const { default: notifications } = await import("./routes/notifications.ts");

// Victor, Ana and Bo have logged in, and Victor follows Ana on Spotify, not Bo. The X-User header says who's asking.
const users: Record<string, Author> = {
  victor: { id: "victor", name: "Victor", image: null },
  ana: { id: "ana", name: "Ana", image: "https://i.scdn.co/image/ab6775700000ee8555c25988a6ac314394d3fbf5" },
  bo: { id: "bo", name: "Bo", image: null },
};
for (const { id, name, image } of Object.values(users)) db.prepare("INSERT INTO users (id, name, image) VALUES (?, ?, ?)").run(id, name, image);
db.prepare("INSERT INTO follows (follower, followee) VALUES ('victor', 'ana')").run();

const server = express()
  .use(express.json())
  .use((req, res, next) => ((res.locals.author = users[req.get("X-User") ?? "victor"]), next()))
  .use("/comments", comments)
  .use("/notifications", notifications)
  .listen(0);
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const get = async (user = "victor"): Promise<any> => (await fetch(`${base}/notifications`, { headers: { "X-User": user } })).json();
const post = async (path: string, body: unknown, user: string): Promise<any> =>
  (await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", "X-User": user }, body: JSON.stringify(body) })).json();

// Each step a minute after the last, so their order is certain.
const start = Date.parse("2026-10-01T12:00:00Z"), minute = 60 * 1000, month = 30 * 24 * 60 * minute;
mock.timers.enable({ apis: ["Date"], now: start });
const step = () => mock.timers.tick(minute);
const song = { songID: "4uLU6hMCjMI75M1A2tKUQC", songName: "Never Gonna Give You Up", songArtist: "Rick Astley", songImage: "https://i.scdn.co/image/ab67616d0000b273e8b066f70c206551210d902b" };
const comment = async (user: string, commentBody: string): Promise<number> => (step(), (await post("/comments/add", { ...song, commentBody, timestamp: 0 }, user)).comment.id);
// As the app sends them: replies carry no song of their own.
const reply = async (user: string, commentBody: string, parentID: number): Promise<number> =>
  (step(), (await post("/comments/add", { songID: song.songID, commentBody, parentID }, user)).comment.id);
const like = async (user: string, id: number) => (step(), post(`/comments/${id}/like`, { liked: true }, user));
const summary = (list: { kind: string; userID: string; commentBody: string }[]) => list.map(({ kind, userID, commentBody }) => [kind, userID, commentBody]);

test("replies to your comments and likes on them, by anyone, and comments by the people you follow, newest first", async () => {
  const mine = await comment("victor", "my take");
  const anaAgrees = await reply("ana", "Ana agrees", mine);
  // Bo isn't followed, but his answers to you count.
  await reply("bo", "Bo doesn't", mine);
  await like("bo", mine);
  // Never your own doing.
  await like("victor", mine);
  const thanks = await reply("victor", "thanks both", mine);
  await comment("victor", "my second take");
  await comment("ana", "Ana's own take");
  // Not followed: Bo's comments don't count, and nor do answers to them.
  const bos = await comment("bo", "Bo's own take");
  await reply("ana", "Ana answering Bo", bos);
  await like("ana", bos);
  // A like on your reply.
  await like("ana", thanks);

  const { notifications } = await get();
  assert.deepEqual(summary(notifications), [
    ["like", "ana", "thanks both"],
    ["comment", "ana", "Ana's own take"],
    ["like", "bo", "my take"],
    ["reply", "bo", "Bo doesn't"],
    ["reply", "ana", "Ana agrees"],
  ]);
  // Who, when, the comment to link to, and its song (from the thread, for replies and likes on them).
  assert.deepEqual(notifications.at(-1), { kind: "reply", at: start + 2 * minute, userID: "ana", userName: "Ana", userImage: users.ana!.image, commentID: anaAgrees, commentBody: "Ana agrees", ...song });
  assert.deepEqual(notifications[0], { kind: "like", at: Date.now(), userID: "ana", userName: "Ana", userImage: users.ana!.image, commentID: thanks, commentBody: "thanks both", ...song });
  // Bo hears of Ana's answer and like, but not of Victor's comments: Bo follows no one.
  assert.deepEqual(summary((await get("bo")).notifications), [["like", "ana", "Bo's own take"], ["reply", "ana", "Ana answering Bo"]]);
});

test("keeps to the last 30 days, and to the newest 100", async () => {
  // A month after Ana's reply, the oldest: it's gone, the rest stay.
  mock.timers.setTime(start + 2 * minute + month + 1);
  assert.deepEqual(summary((await get()).notifications).at(-1), ["reply", "bo", "Bo doesn't"]);
  assert.equal((await get()).notifications.length, 4);
  const insert = db.prepare("INSERT INTO comments (authorID, authorName, songID, commentBody, timestamp, createdAt) VALUES ('ana', 'Ana', ?, ?, 0, ?)");
  for (let n = 0; n < 105; n++) insert.run(song.songID, `burst ${n}`, Date.now());
  const { notifications } = await get();
  assert.equal(notifications.length, 100);
  assert.ok(notifications.every((n: { commentBody: string }) => n.commentBody.startsWith("burst")));
});

test("remembers when you last opened them, for each of you", async () => {
  assert.equal((await get()).seenAt, null);
  step();
  const { seenAt } = await post("/notifications/seen", {}, "victor");
  assert.equal(seenAt, Date.now());
  assert.equal((await get()).seenAt, seenAt);
  assert.equal((await get("ana")).seenAt, null);
});
