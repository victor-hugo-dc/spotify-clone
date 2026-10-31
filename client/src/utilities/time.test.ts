import { test } from "node:test";
import assert from "node:assert/strict";
import formatTime, { addedAgo, totalLength } from "./time.ts";

test("formats milliseconds as m:ss without rounding up to :60", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(61000), "1:01");
  assert.equal(formatTime(59999), "0:59");
});

test("says how long ago a song was added, then switches to the date", () => {
  const now = Date.parse("2026-10-31T12:00:00Z");
  assert.equal(addedAgo("2026-10-31T11:59:59Z", now), "1 second ago");
  assert.equal(addedAgo("2026-10-31T11:58:00Z", now), "2 minutes ago");
  assert.equal(addedAgo("2026-10-30T22:00:00Z", now), "14 hours ago");
  assert.equal(addedAgo("2026-10-28T12:00:00Z", now), "3 days ago");
  assert.equal(addedAgo("2026-10-17T12:00:00Z", now), "2 weeks ago");
  assert.equal(addedAgo("2025-09-03T12:00:00Z", now), "Sep 3, 2025");
  assert.equal(addedAgo("2026-11-01T12:00:00Z", now), "0 seconds ago"); // clock skew: never "in the future"
});

test("words a list's total length like Spotify", () => {
  assert.equal(totalLength(45_000), "45 sec");
  assert.equal(totalLength((48 * 60 + 12) * 1000), "48 min 12 sec");
  assert.equal(totalLength((3 * 3600 + 20 * 60 + 5) * 1000), "about 3 hr 20 min");
  assert.equal(totalLength(2 * 3600 * 1000), "about 2 hr");
  assert.equal(totalLength(25 * 3600 * 1000), "over 24 hr");
});
