import { test } from "node:test";
import assert from "node:assert/strict";
import { chunks, songStats } from "./lists.ts";

const songs = (...minutes: number[]) => minutes.map((m) => ({ duration_ms: m * 60_000 }));

test("counts a list's songs, with its length once all of them are loaded", () => {
  assert.equal(songStats(1, songs(3)), "1 song, 3 min 0 sec");
  assert.equal(songStats(2, songs(30, 45)), "2 songs, about 1 hr 15 min");
  assert.equal(songStats(1309, songs(3, 4)), "1,309 songs");
});

test("says nothing about a list of unknown size or with no songs", () => {
  assert.equal(songStats(undefined, []), undefined);
  assert.equal(songStats(null, songs(3)), undefined);
  assert.equal(songStats(0, []), undefined);
});

test("splits a list into requests of at most so many", () => {
  assert.deepEqual(chunks([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunks(["a"], 40), [["a"]]);
  assert.deepEqual(chunks([], 40), []);
});
