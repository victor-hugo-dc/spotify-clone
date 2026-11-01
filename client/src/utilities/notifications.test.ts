import { test } from "node:test";
import assert from "node:assert/strict";
import { isNew, recentReleases, whatsNew } from "./notifications.ts";
import type { Album, Notification } from "./types.ts";

const album = (id: string, release_date: string, release_date_precision: Album["release_date_precision"] = "day"): Album =>
  ({ id, type: "album", uri: `spotify:album:${id}`, name: id, album_type: "single", artists: [], images: [], release_date, release_date_precision });
const midnight = (day: string) => new Date(`${day}T00:00`).getTime();
const now = new Date("2026-11-01T15:00").getTime();
const ids = (items: { kind: string; at: number }[]) => items.map((item) => ("album" in item ? (item.album as Album).id : `${item.kind}@${item.at}`));

test("keeps the releases of the last 30 days, each once, newest first, as of their day's midnight", () => {
  const releases = recentReleases([
    album("older", "2026-10-02"), // 30 days and 15 hours ago
    album("month-old", "2026-10-03"),
    album("today", "2026-11-01"),
    album("last-week", "2026-10-25"),
    // Only a month or a year: can't be placed, so left out.
    album("october", "2026-10", "month"),
    album("this-year", "2026", "year"),
    // By two artists you follow, so under both.
    album("today", "2026-11-01"),
  ], now);
  assert.deepEqual(ids(releases), ["today", "last-week", "month-old"]);
  assert.equal(releases[0]!.at, midnight("2026-11-01"));
  assert.deepEqual(recentReleases([album("bad", "soon")], now), []);
});

test("mixes releases and Shoutify's notifications by time, and the chips pick one kind", () => {
  const releases = recentReleases([album("today", "2026-11-01"), album("last-week", "2026-10-25")], now);
  const notification = (kind: Notification["kind"], at: number) => ({ kind, at }) as Notification;
  const notifications = [notification("reply", now - 1000), notification("like", midnight("2026-10-30")), notification("comment", midnight("2026-10-20"))];
  const all = [`reply@${now - 1000}`, "today", `like@${midnight("2026-10-30")}`, "last-week", `comment@${midnight("2026-10-20")}`];
  assert.deepEqual(ids(whatsNew(notifications, releases, "All")), all);
  assert.deepEqual(ids(whatsNew(notifications, releases, "Music")), ["today", "last-week"]);
  assert.deepEqual(ids(whatsNew(notifications, releases, "Comments")), all.filter((id) => id.includes("@")));
});

test("new: whatever came since you last looked, and everything if you never have", () => {
  const [today] = recentReleases([album("today", "2026-11-01")], now);
  assert.equal(isNew(today!, null), true);
  assert.equal(isNew(today!, midnight("2026-10-31") + 23 * 3600 * 1000), true);
  assert.equal(isNew(today!, midnight("2026-11-01")), false);
  assert.equal(isNew(today!, now), false);
});
