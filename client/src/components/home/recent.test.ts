import { test } from "node:test";
import assert from "node:assert/strict";
import { likedSongs, pickShortcuts, recentContexts, type Context } from "./recent.ts";
import type { PlayHistory, Playlist } from "../../utilities/types.ts";

const album = (id: string) => ({ id, type: "album", uri: `spotify:album:${id}`, name: `Album ${id}` }) as unknown as Context;
const playlist = (id: string) => ({ id, type: "playlist", uri: `spotify:playlist:${id}`, name: `Playlist ${id}` }) as unknown as Playlist;
const artist = (id: string) => ({ id, type: "artist", uri: `spotify:artist:${id}`, name: `Artist ${id}` }) as unknown as Context;
// A play of a song from album `from`, in the context `uri` (or none).
const play = (from: string, uri: string | null) =>
  ({ track: { album: album(from) }, played_at: "", context: uri && { type: uri.split(":")[1], uri } }) as unknown as PlayHistory;
const uris = (items: (Context | string | { uri?: string; id: string })[]) => items.map((item) => typeof item === "string" ? item : "uri" in item && item.uri ? item.uri : item.id);

test("lists each context once, newest first, a song played on its own as its album", () => {
  const plays = [
    play("a1", "spotify:playlist:p1"),
    play("a2", null),
    play("a3", "spotify:playlist:p1"),
    play("a4", "spotify:artist:r1"),
    play("a2", "spotify:album:a2"),
  ];
  const library = [playlist("p1"), artist("r1")];
  assert.deepEqual(uris(recentContexts(plays, library, new Map())), ["spotify:playlist:p1", "spotify:album:a2", "spotify:artist:r1"]);
});

test("skips Liked Songs, episodes and local files, which have no context to show", () => {
  const local = { track: { album: { uri: null } }, played_at: "", context: null } as unknown as PlayHistory;
  const plays = [play("a1", "spotify:user:victor:collection"), play("a2", "spotify:show:s1"), local];
  assert.deepEqual(recentContexts(plays, [], new Map()), []);
});

test("takes names and covers from Your Library, then the song's album, then what was fetched", () => {
  const saved = playlist("p1");
  const fetchedArtist = artist("r2");
  const plays = [play("a1", "spotify:playlist:p1"), play("a1", "spotify:album:a1"), play("a5", "spotify:artist:r2"), play("a6", "spotify:playlist:p9")];
  const found = recentContexts(plays, [saved], new Map([["spotify:artist:r2", fetchedArtist]]));
  assert.equal(found[0], saved);
  assert.equal((found[1] as Context).name, "Album a1");
  assert.equal(found[2], fetchedArtist);
  // Not known anywhere yet: its URI, to fetch.
  assert.equal(found[3], "spotify:playlist:p9");
});

test("leaves out a context that couldn't be fetched", () => {
  const plays = [play("a1", "spotify:playlist:gone"), play("a2", null)];
  assert.deepEqual(uris(recentContexts(plays, [], new Map([["spotify:playlist:gone", null]]))), ["spotify:album:a2"]);
});

test("shortcuts: Liked Songs, the recent contexts, then your other playlists, 8 at most", () => {
  const recent = [playlist("p2"), "spotify:artist:r9", album("a1")];
  const playlists = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"].map(playlist);
  const picked = pickShortcuts(recent, playlists);
  assert.equal(picked[0], likedSongs);
  assert.deepEqual(uris(picked), ["liked-songs", "spotify:playlist:p2", "spotify:artist:r9", "spotify:album:a1",
    "spotify:playlist:p1", "spotify:playlist:p3", "spotify:playlist:p4", "spotify:playlist:p5"]);
  assert.deepEqual(uris(pickShortcuts([], [])), ["liked-songs"]);
});
