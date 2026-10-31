import { test } from "node:test";
import assert from "node:assert/strict";
import { topResult } from "./topResult.ts";

const artist = (name: string) => ({ id: name, type: "artist" as const, uri: `spotify:artist:${name}`, name });
const track = (name: string) => ({ id: name, type: "track" as const, uri: `spotify:track:${name}`, name, duration_ms: 1000, explicit: false, artists: [] });
const none = { tracks: [], artists: [], albums: [], playlists: [] };

test("an artist whose name is being typed is the top result", () => {
  const songs = [track("One More Time")];
  assert.equal(topResult("daft p", { ...none, artists: [artist("Daft Punk")], tracks: songs })?.name, "Daft Punk");
  assert.equal(topResult("  BEYONCE ", { ...none, artists: [artist("Beyoncé")], tracks: songs })?.name, "Beyoncé");
  assert.equal(topResult("weeknd", { ...none, artists: [artist("The Weeknd")], tracks: songs })?.name, "The Weeknd");
});

test("otherwise the first song, and with no songs whatever came first", () => {
  assert.equal(topResult("one more time", { ...none, artists: [artist("Daft Punk")], tracks: [track("One More Time")] })?.name, "One More Time");
  assert.equal(topResult("track", { ...none, artists: [artist("Artist One")], tracks: [track("Track One")] })?.name, "Track One");
  assert.equal(topResult("!!!", { ...none, artists: [artist("Daft Punk")], tracks: [track("Around the World")] })?.name, "Around the World");
  assert.equal(topResult("live", { ...none, artists: [artist("Daft Punk")] })?.name, "Daft Punk");
  assert.equal(topResult("anything", none), null);
});
