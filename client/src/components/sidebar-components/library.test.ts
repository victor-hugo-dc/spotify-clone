import { test } from "node:test";
import assert from "node:assert/strict";
import { libraryItems, matches, sortItems } from "./library.ts";
import type { Artist, PlayHistory, Playlist, SavedAlbum, Track } from "../../utilities/types.ts";

const user = (name: string) => ({ id: name.toLowerCase(), type: "user" as const, uri: `spotify:user:${name}`, display_name: name });
const playlist = (id: string, name: string, owner = "Victor"): Playlist =>
  ({ id, type: "playlist", uri: `spotify:playlist:${id}`, name, description: null, images: null, owner: user(owner) });
const artist = (id: string, name: string): Artist => ({ id, type: "artist", uri: `spotify:artist:${id}`, name });
const saved = (id: string, name: string, by: Artist[], added_at: string): SavedAlbum =>
  ({ added_at, album: { id, type: "album", uri: `spotify:album:${id}`, name, album_type: "album", artists: by, images: [], release_date: "2024" } });
const play = (uri: string | null, played_at: string): PlayHistory =>
  ({ track: {} as Track, played_at, context: uri ? { type: uri.split(":")[1]!, uri } : null });

const zed = artist("ar1", "Zed"), amy = artist("ar2", "amy");
const items = libraryItems(
  [playlist("p1", "Mix 10"), playlist("p2", "road trip", "Bob"), playlist("p3", "Mix 2")],
  [saved("al1", "Older", [zed], "2026-01-01T00:00:00Z"), saved("al2", "Newer", [amy, zed], "2026-06-01T00:00:00Z")],
  [zed, amy],
);
const names = (sorted: { name: string }[]) => sorted.map((item) => item.name);

test("lists playlists, albums and artists in Spotify's order, with who made each", () => {
  assert.deepEqual(names(items), ["Mix 10", "road trip", "Mix 2", "Older", "Newer", "Zed", "amy"]);
  assert.deepEqual(items.map((item) => item.by), ["Victor", "Bob", "Victor", "Zed", "amy, Zed", "", ""]);
  assert.equal(libraryItems([null as unknown as Playlist], [], []).length, 0);
});

test("Recents: latest play first, never-played items after in Spotify's order", () => {
  const played = [
    play("spotify:album:al1", "2026-10-30T10:00:00Z"),
    play(null, "2026-10-30T09:00:00Z"),
    play("spotify:playlist:p3", "2026-10-30T08:00:00Z"),
    play("spotify:album:al1", "2026-10-29T08:00:00Z"),
    play("spotify:artist:ar2", "2026-10-31T08:00:00Z"), // out of order: the latest play counts, wherever it is
  ];
  assert.deepEqual(names(sortItems(items, "recents", played)), ["amy", "Older", "Mix 2", "Mix 10", "road trip", "Newer", "Zed"]);
  assert.deepEqual(names(sortItems(items, "recents", [])), names(items));
});

test("Recently Added: albums newest first, between playlists and artists in Spotify's order", () => {
  assert.deepEqual(names(sortItems(items, "added", [])), ["Mix 10", "road trip", "Mix 2", "Newer", "Older", "Zed", "amy"]);
});

test("Alphabetical ignores case and orders numbers as numbers", () => {
  assert.deepEqual(names(sortItems(items, "alphabetical", [])), ["amy", "Mix 2", "Mix 10", "Newer", "Older", "road trip", "Zed"]);
});

test("Creator: by owner or artist, an artist being its own; ties keep Spotify's order", () => {
  assert.deepEqual(names(sortItems(items, "creator", [])), ["amy", "Newer", "road trip", "Mix 10", "Mix 2", "Older", "Zed"]);
});

test("searching matches the name, owner or artists, whatever the case", () => {
  const found = (text: string) => names(items.filter((item) => matches(item, text)));
  assert.deepEqual(found("MIX"), ["Mix 10", "Mix 2"]);
  assert.deepEqual(found(" bob "), ["road trip"]);
  assert.deepEqual(found("zed"), ["Older", "Newer", "Zed"]);
  assert.equal(found("").length, items.length);
});
