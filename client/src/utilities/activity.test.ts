import { test } from "node:test";
import assert from "node:assert/strict";
import { lastPlayed, playingNow, type Activity } from "./activity.ts";

// A 3:20 song, reported a minute in at t = 1,000,000.
const at = 1_000_000;
const song: Activity = {
  songID: "4uLU6hMCjMI75M1A2tKUQC", songName: "Track One", songArtist: "Artist One", songImage: null, albumID: "al1", albumName: "Album One",
  playing: true, duration: 200_000, position: 60_000, at,
};

test("playing now until the song would have ended", () => {
  assert.equal(playingNow(song, at), true);
  assert.equal(playingNow(song, at + 139_999), true);
  assert.equal(playingNow(song, at + 140_000), false);
  assert.equal(playingNow({ ...song, playing: false }, at), false);
});

test("last played when the song ended, or when it was paused", () => {
  assert.equal(lastPlayed(song), at + 140_000);
  assert.equal(lastPlayed({ ...song, playing: false }), at);
});
