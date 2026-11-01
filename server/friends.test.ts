import { test, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

Object.assign(process.env, { CLIENT_ID: "id", CLIENT_SECRET: "secret", RE_URI: "https://shoutify.test/api/callback", DB_PATH: ":memory:" });
const { app } = await import("./index.ts");
const { db } = await import("./db.ts");

// Spotify, faked: the refresh token "<id>-refresh" logs in as <id>, named names[id]. follows[id] is whom they follow;
// while `failing`, the follow check fails. `asked` keeps the users each follow check asked about.
const names: Record<string, string> = { victor: "Victor", ana: "Ana", bo: "Bo", cy: "Cy" };
const follows: Record<string, string[]> = {};
let failing = false;
const asked: string[][] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  const user = new Headers(init?.headers).get("authorization")?.replace(/^Bearer (.*)-access$/, "$1") ?? "";
  if (url.href === "https://accounts.spotify.com/api/token")
    return Response.json({ access_token: new URLSearchParams(String(init?.body)).get("refresh_token")?.replace(/-refresh$/, "-access"), expires_in: 3600 });
  if (url.href === "https://api.spotify.com/v1/me") return Response.json({ id: user, display_name: names[user], images: [] });
  if (url.origin + url.pathname === "https://api.spotify.com/v1/me/library/contains") {
    if (failing) return new Response(null, { status: 503 });
    const ids = (url.searchParams.get("uris") ?? "").split(",").map((uri) => uri.replace(/^spotify:user:/, ""));
    asked.push(ids);
    return Response.json(ids.map((id) => follows[user]?.includes(id) ?? false));
  }
  return realFetch(input, init);
};

const server = app.listen(0);
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

// A token refresh, as the app makes hourly; its author cookie signs `id` in.
async function login(id: string) {
  const response = await fetch(`${base}/api/token`, { headers: { cookie: `__Host-refresh_key=${id}-refresh` } });
  assert.equal(response.status, 200, `${id}'s refresh`);
  return response.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}
const get = async (path: string, cookie: string): Promise<any> => (await fetch(base + path, { headers: { cookie } })).json();
const post = (path: string, cookie: string, body: unknown) =>
  fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(body) });
const friends = async (cookie: string) => (await get("/api/friends", cookie)).friends;
const ids = async (cookie: string) => (await friends(cookie)).map((friend: { id: string }) => friend.id);

test("remembers everyone who logs in, as Spotify last named them", async () => {
  await login("victor");
  names.ana = "Ana B.";
  await login("ana");
  names.ana = "Ana";
  await login("ana");
  assert.deepEqual(db.prepare("SELECT id, name, image FROM users ORDER BY id").all().map((row) => ({ ...row })), [
    { id: "ana", name: "Ana", image: null },
    { id: "victor", name: "Victor", image: null },
  ]);
});

test("friends are the people here you follow on Spotify, asked again at each token refresh", async () => {
  follows.victor = ["ana"];
  const victor = await login("victor");
  assert.deepEqual(await friends(victor), [{ id: "ana", name: "Ana", image: null, activity: null }]);
  // Bo joins and Victor follows Bo instead: the old follows are replaced.
  await login("bo");
  follows.victor = ["bo"];
  await login("victor");
  assert.deepEqual(await ids(victor), ["bo"]);
  // Nobody here follows Victor, and Bo follows no one.
  assert.deepEqual(await ids(await login("bo")), []);
  assert.equal((await fetch(`${base}/api/friends`)).status, 401);
});

test("keeps the last follows when Spotify can't say, and still logs in", async () => {
  failing = true;
  follows.victor = [];
  try {
    const victor = await login("victor");
    assert.deepEqual(await ids(victor), ["bo"]);
  } finally {
    failing = false;
  }
});

test("asks Spotify about 40 people at a time", async () => {
  const extra = Array.from({ length: 45 }, (_, n) => `u${n}`);
  for (const id of extra) db.prepare("INSERT INTO users (id, name) VALUES (?, ?)").run(id, id);
  follows.victor = ["ana", "u44"];
  asked.length = 0;
  try {
    const victor = await login("victor");
    assert.deepEqual(asked.map((users) => users.length), [40, 7]);
    assert.deepEqual(new Set(asked.flat()), new Set(["ana", "bo", ...extra]));
    assert.deepEqual((await ids(victor)).sort(), ["ana", "u44"]);
  } finally {
    db.prepare("DELETE FROM users WHERE id LIKE 'u%'").run();
  }
});

const song = {
  songID: "4uLU6hMCjMI75M1A2tKUQC",
  songName: "Never Gonna Give You Up",
  songArtist: "Rick Astley",
  songImage: "https://i.scdn.co/image/ab67616d0000b273e8b066f70c206551210d902b",
  albumID: "6N9PS4QXF1D0OWPk0Sxtb4",
  albumName: "Whenever You Need Somebody",
  playing: true,
  duration: 213000,
  position: 1000,
};

test("takes only well-formed reports of what you play, from you", async () => {
  const ana = await login("ana");
  assert.equal((await post("/api/activity", "", song)).status, 401);
  const bad = [
    { songID: "spotify:local:Me:Tape" }, { songName: " " }, { songArtist: undefined }, { songName: "x".repeat(301) },
    { songImage: "https://tracker.example/pixel.gif" }, { albumID: "../../api/logout" }, { albumName: 5 }, { playing: "true" },
    { duration: -1 }, { duration: 2 ** 60 }, { position: 1.5 }, { position: 214000 }, { at: "yesterday" }, { at: -1 },
  ];
  for (const fields of bad) assert.equal((await post("/api/activity", ana, { ...song, ...fields })).status, 400, JSON.stringify(fields));
  assert.equal((await post("/api/activity", ana, { ...song, songImage: undefined, albumID: undefined, albumName: undefined })).status, 204);
});

test("keeps the newer report, so a late one from history can't replace what's playing", async () => {
  const ana = await login("ana");
  follows.victor = ["ana"];
  const victor = await login("victor");
  const activity = async () => (await friends(victor))[0].activity;
  const before = Date.now();
  assert.equal((await post("/api/activity", ana, song)).status, 204);
  const live = await activity();
  assert.ok(live.at >= before && live.at <= Date.now(), `at ${live.at}`);
  assert.deepEqual(live, { ...song, at: live.at });
  // From history: older than the live report.
  await post("/api/activity", ana, { ...song, songName: "Older", playing: false, at: before - 60000 });
  assert.deepEqual(await activity(), live);
  // Paused a moment later.
  await post("/api/activity", ana, { ...song, playing: false, position: 5000 });
  assert.deepEqual({ ...(await activity()), at: 0 }, { ...song, playing: false, position: 5000, at: 0 });
  // A clock running ahead is taken as now, so it doesn't keep the next report out.
  await post("/api/activity", ana, { ...song, songName: "Ahead", at: Date.now() + 60 * 60 * 1000 });
  assert.ok((await activity()).at <= Date.now());
  await post("/api/activity", ana, { ...song, songName: "Next" });
  assert.equal((await activity()).songName, "Next");
});

test("lists those still playing first, then the most recent, and never anyone you don't follow", async () => {
  const [ana, bo] = [await login("ana"), await login("bo")];
  await login("cy");
  follows.victor = ["ana", "bo", "cy"];
  const victor = await login("victor");
  await post("/api/activity", ana, { ...song, playing: false });
  // A minute in, with three and a half to go.
  await post("/api/activity", bo, { ...song, at: Date.now() - 60000 });
  assert.deepEqual(await ids(victor), ["bo", "ana", "cy"]);
  // Bo's song ended (half a minute ago, 13 s before its end), so Bo isn't playing it now.
  await post("/api/activity", bo, { ...song, position: 200000, at: Date.now() - 30000 });
  assert.deepEqual(await ids(victor), ["ana", "bo", "cy"]);
  follows.victor = ["cy"];
  assert.deepEqual(await ids(await login("victor")), ["cy"]);
});

test("the Social feed has the top-level comments of the people you follow, whatever their likes", async () => {
  const [ana, bo, cy] = [await login("ana"), await login("bo"), await login("cy")];
  follows.victor = ["ana"];
  const victor = await login("victor");
  const comment = async (cookie: string, commentBody: string, parentID?: number): Promise<{ id: number }> =>
    ((await (await post("/api/comments/add", cookie, { songID: song.songID, commentBody, timestamp: 0, parentID })).json()) as any).comment;
  const first = await comment(ana, "first from Ana");
  const fromBo = await comment(bo, "from Bo");
  await comment(victor, "Victor's own");
  await comment(ana, "Ana replying to Bo", fromBo.id);
  await comment(ana, "second from Ana");
  await post(`/api/comments/${first.id}/like`, bo, { liked: true });

  const feed = (await get("/api/comments/feed", victor)).comments;
  assert.deepEqual(feed.map((c: { commentBody: string }) => c.commentBody), ["second from Ana", "first from Ana"]);
  // The same rows as on the song's page.
  const onSong = (await get(`/api/comments/song/${song.songID}`, victor)).comments;
  assert.deepEqual(feed, onSong.filter((c: { authorID: string; parentID: number | null }) => c.authorID === "ana" && c.parentID === null).reverse());
  assert.equal(feed[1].likes, 1);
  assert.deepEqual((await get("/api/comments/feed", cy)).comments, []);
  assert.equal((await fetch(`${base}/api/comments/feed`)).status, 401);
});
