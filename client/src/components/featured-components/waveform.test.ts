import { test } from "node:test";
import assert from "node:assert/strict";
import { shoutOut, waveform } from "./waveform.ts";

// A top-level comment about `timestamp` (ms); ids count up, so each one made is newer than the last.
let ids = 0;
const comment = (timestamp: number, more = {}) => ({ id: ++ids, parentID: null, timestamp, likes: 0, replies: 0, ...more });

test("shouts out comments about the 4 s up to the playhead", () => {
  const at = comment(10_000), inside = comment(6_001), past = comment(6_000), ahead = comment(10_001);
  assert.equal(shoutOut([at], 10_000), at);
  assert.equal(shoutOut([inside], 10_000), inside);
  assert.equal(shoutOut([past], 10_000), null);
  assert.equal(shoutOut([ahead], 10_000), null);
});

test("picks the most liked, then the most replied to, then the newest", () => {
  const liked = comment(7_000, { likes: 2 }), newer = comment(9_000, { likes: 1, replies: 4 });
  assert.equal(shoutOut([liked, newer], 10_000), liked);
  const replied = comment(7_000, { likes: 2, replies: 1 });
  assert.equal(shoutOut([replied, liked], 10_000), replied);
  const tied = comment(8_000, { likes: 2, replies: 1 });
  assert.equal(shoutOut([tied, replied], 10_000), tied);
  assert.equal(shoutOut([replied, tied], 10_000), tied);
});

test("never shouts out a reply, nor anything when no comment is in the window", () => {
  const top = comment(8_000), reply = comment(9_000, { parentID: 1, likes: 9 });
  assert.equal(shoutOut([reply, top], 10_000), top);
  assert.equal(shoutOut([reply], 10_000), null);
  assert.equal(shoutOut([comment(1_000), comment(20_000)], 10_000), null);
  assert.equal(shoutOut([], 10_000), null);
});

test("draws the same bars for a song every time, within the waveform, quieter at the ends", () => {
  const bars = waveform("4uLU6hMCjMI75M1A2tKUQC", 200);
  assert.equal(bars.length, 200);
  assert.deepEqual(waveform("4uLU6hMCjMI75M1A2tKUQC", 200), bars);
  assert.notDeepEqual(waveform("TrackTwo00000000000000", 200), bars);
  for (const id of ["4uLU6hMCjMI75M1A2tKUQC", "TrackTwo00000000000000", "", "x"]) {
    const heights = waveform(id, 200);
    assert.ok(heights.every((h) => h > 0 && h <= 1), id);
    assert.equal(Math.max(...heights), 1, id);
    const mean = (part: number[]) => part.reduce((sum, h) => sum + h, 0) / part.length;
    assert.ok(mean(heights.slice(0, 6)) < mean(heights.slice(60, 140)) && mean(heights.slice(-6)) < mean(heights.slice(60, 140)), id);
  }
});
