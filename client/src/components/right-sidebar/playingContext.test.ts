import { test } from "node:test";
import assert from "node:assert/strict";
import { playingContext } from "./playingContext.ts";

const library = {
  playlists: [{ uri: "spotify:playlist:p1", name: "Mix" }],
  albums: [{ album: { uri: "spotify:album:saved", name: "Saved Album" } }],
  artists: [{ uri: "spotify:artist:followed", name: "Followed Artist" }],
} as any;
const track = { album: { id: "al1", name: "Album One" }, artists: [{ id: "ar1", name: "Artist One" }, { id: null, name: "Local" }] } as any;

test("names what the song plays from, with its page", () => {
  assert.deepEqual(playingContext("spotify:user:victor:collection", library, track), { name: "Liked Songs", path: "/tracks" });
  assert.deepEqual(playingContext("spotify:playlist:p1", library, track), { name: "Mix", path: "/playlist/p1" });
  assert.deepEqual(playingContext("spotify:album:saved", library, track), { name: "Saved Album", path: "/album/saved" });
  assert.deepEqual(playingContext("spotify:artist:followed", library, track), { name: "Followed Artist", path: "/artist/followed" });
});

test("falls back on the song's own album and artists", () => {
  assert.deepEqual(playingContext("spotify:album:al1", library, track), { name: "Album One", path: "/album/al1" });
  assert.deepEqual(playingContext("spotify:artist:ar1", library, track), { name: "Artist One", path: "/artist/ar1" });
});

test("is just Now playing when it can't tell", () => {
  const unknown = { name: "Now playing", path: null };
  assert.deepEqual(playingContext(null, library, track), unknown);
  assert.deepEqual(playingContext("spotify:playlist:elsewhere", library, track), unknown);
  assert.deepEqual(playingContext("spotify:album:other", library, null), unknown);
  assert.deepEqual(playingContext("spotify:show:s1", library, track), unknown);
});
