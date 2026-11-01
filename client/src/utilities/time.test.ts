import { test } from "node:test";
import assert from "node:assert/strict";
import formatTime, { addedAgo, parseTime, positionAt, postedAgo, totalLength } from "./time.ts";

test("formats milliseconds as m:ss without rounding up to :60", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(61000), "1:01");
  assert.equal(formatTime(59999), "0:59");
});

test("reads a typed time only when it's in the song", () => {
  const length = 200_000; // 3:20
  assert.equal(parseTime("0:00", length), 0);
  assert.equal(parseTime("3:20", length), 200_000);
  assert.equal(parseTime("3:20", 200_999), 200_000); // the length as shown, though the song runs a little longer
  assert.equal(parseTime("3:21", length), null);
  assert.equal(parseTime(" 1:05\n", length), 65_000);
  for (const bad of ["", " ", "abc", "1:5", "1:60", "-0:01", "1:2:3", "01:00:60", "1.05", "1:05:", "1:05pm"]) {
    assert.equal(parseTime(bad, length), null, `"${bad}"`);
  }
});

test("reads times past an hour as h:mm:ss, or as the minutes the chip shows", () => {
  const twoHours = 2 * 3600_000;
  assert.equal(parseTime("1:02:05", twoHours), 3_725_000);
  assert.equal(parseTime("62:05", twoHours), 3_725_000);
  assert.equal(parseTime("2:00:00", twoHours), twoHours);
  assert.equal(parseTime("2:00:01", twoHours), null);
  assert.equal(parseTime("1:2:05", twoHours), null);
});

test("counts on from the last reading while playing, never past the end", () => {
  const clock = { play: true, progress: 1000, at: 5000, total_time: 3000 };
  assert.equal(positionAt(clock, 5500), 1500);
  assert.equal(positionAt(clock, 4000), 1000); // a tick from before the reading doesn't go back
  assert.equal(positionAt(clock, 9000), 3000);
  assert.equal(positionAt({ ...clock, play: false }, 9000), 1000);
});

test("says when a comment was posted the way Twitter does", () => {
  const now = Date.parse("2026-10-31T12:00:00Z");
  const ago = (s: number) => postedAgo(now - s * 1000, now);
  assert.equal(ago(0), "now");
  assert.equal(ago(4), "now");
  assert.equal(ago(-30), "now"); // clock skew: never "in the future"
  assert.equal(ago(45), "45s");
  assert.equal(ago(60), "1m");
  assert.equal(ago(12 * 60), "12m");
  assert.equal(ago(3 * 3600), "3h");
  assert.equal(ago(24 * 3600 - 1), "23h");
  assert.equal(ago(5 * 86400), "5d");
  assert.equal(ago(7 * 86400), "Oct 24");
  assert.equal(postedAgo(Date.parse("2025-10-31T12:00:00Z"), now), "Oct 31, 2025");
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
