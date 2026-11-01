// What's New, behind the top bar's bell: the last 30 days' releases of the artists Victor follows on Spotify, mixed by
// time with Shoutify's notifications: replies to his comments and likes on them, by anyone, and comments by Ana, whom he
// follows (not Bo, whom he doesn't). The bell has a dot while any of it is new; opening What's New marks it all seen.
import { album, album2, album3, img, track } from "../data.mjs";
import { as, comment, far, likeButton, likeState, main, replyButton, row as commentRow, settles, thread, box as replyBox, composer } from "./replies.mjs";
import { hasFocus } from "./comments.mjs";
import { until } from "./frame.mjs";
import { login } from "./friends.mjs";
import { row } from "./library.mjs";

const bell = { ...track, id: "BellTrack0000000000000", name: "Bell Track", uri: "spotify:track:BellTrack0000000000000" };
const onBell = { songID: bell.id, songName: bell.name, songArtist: "Artist One", songImage: img(2)[0].url };
// Released this many days ago, dated to the day as Spotify does.
const released = (al, days) => {
  const day = new Date(Date.now() - days * 24 * 3600 * 1000);
  const date = [day.getFullYear(), day.getMonth() + 1, day.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
  return { ...al, release_date: date, release_date_precision: "day" };
};

// Single Three (by both artists) came out 2 days ago, Album Two 9 days ago; Album One, 45 days ago, is too old.
export const fixtures = {
  [`/v1/tracks/${bell.id}`]: bell,
  "/v1/artists/ar1/albums": { items: [released(album3, 2), released(album, 45)], next: null },
  "/v1/artists/ar2/albums": { items: [released(album3, 2), released(album2, 9)], next: null },
};

export const replaces = [
  // friends.mjs's What's New had everyone's comments; it's notifications now (notifications).
  "whats-new",
  // What's New leaves out your own comments (comment-flow-own).
  "comment-flow-whats-new",
  // What's New's rows have no Like or Reply now; Social's do (reply-from-social).
  "reply-from-whats-new-page",
];

const victorSays = "Victor on the bell track", anaReplies = "Ana answers Victor", anaSays = "Ana on the bell track", boSays = "Bo on the bell track";
const items = (p) => main(p).getByRole("listitem");
const releases = (p) => main(p).getByRole("button", { name: /^(Play|Pause) / });
const dotted = (p) => items(p).filter({ has: p.getByRole("img", { name: "New", exact: true }) });
// One request at a time, a moment apart, so the server times them in order.
const pause = (p) => p.waitForTimeout(20);

export const checks = [
  // As Ana and Bo, since Victor last looked: a reply to his comment, a like on it, and a comment each. The bell shows a
  // dot and says so; What's New has the reply, the like and Ana's comment (not Bo's, nor Victor's own), then the recent
  // releases, newest first, not the old one; what's new has a dot until the next visit; the bell's dot clears.
  ["notifications", "/", async (p, t) => {
    await login(t, "ana");
    await login(t, "bo");
    await as(t, "Victor", "/notifications/seen", {});
    const mine = (await as(t, "Victor", "/comments/add", { ...onBell, commentBody: victorSays, timestamp: 1000 })).comment;
    await pause(p);
    await as(t, "Ana", "/comments/add", { songID: bell.id, commentBody: anaReplies, parentID: mine.id });
    await pause(p);
    await as(t, "Bo", `/comments/${mine.id}/like`, { liked: true });
    await pause(p);
    await as(t, "Ana", "/comments/add", { ...onBell, commentBody: anaSays, timestamp: 2000 });
    await pause(p);
    await as(t, "Bo", "/comments/add", { ...onBell, commentBody: boSays, timestamp: 3000 });
    await p.reload({ waitUntil: "networkidle" });

    const bellLink = p.getByRole("link", { name: "What's New (new)", exact: true });
    await bellLink.waitFor({ timeout: 3000 });
    if (!(await p.locator(".top-bar-dot").isVisible())) throw new Error("no dot on the bell");
    await t.snap(p, "bell-new");
    await bellLink.click();
    await p.waitForURL("**/whats-new");
    await main(p).getByRole("heading", { name: "What's New", exact: true }).waitFor({ timeout: 3000 });
    await items(p).filter({ hasText: anaSays }).waitFor({ timeout: 3000 });
    const texts = (await items(p).allInnerTexts()).map((text) => text.replace(/\s+/g, " "));
    const at = (...parts) => texts.findIndex((text) => parts.every((part) => text.includes(part)));
    const order = [at("Ana commented on Bell Track", anaSays), at("Bo liked your comment", victorSays), at("Ana replied to your comment", anaReplies),
      at("Single Three", "Single • Artist One, Artist Two"), at("Album Two", "Album • Artist Two")];
    if (order.some((n) => n < 0) || order.some((n, i) => i && n <= order[i - 1])) throw new Error(`out of order or missing (${order}): ${JSON.stringify(texts.slice(0, 6))}`);
    if (texts.some((text) => text.includes(boSays))) throw new Error("Bo's comment is in What's New");
    if (texts.filter((text) => text.includes(victorSays)).length !== 1) throw new Error("Victor's own comment is in What's New");
    const played = await releases(p).evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-label")));
    if (played.join() !== "Play Single Three,Play Album Two") throw new Error(`releases: ${JSON.stringify(played)}`);
    const fresh = async () => (await dotted(p).allInnerTexts()).map((text) => text.replace(/\s+/g, " "));
    const wanted = [anaSays, victorSays, anaReplies];
    const check = (got) => got.length === wanted.length && wanted.every((text, i) => got[i].includes(text));
    if (!check(await fresh())) throw new Error(`new: ${JSON.stringify(await fresh())}`);
    if (await row(p, "Social").getAttribute("aria-current")) throw new Error("Social is current on What's New");
    // Seen now: the bell's dot goes, this visit's dots stay.
    await until(p, () => !document.querySelector(".top-bar-dot"), "the bell's dot didn't clear");
    await p.getByRole("link", { name: "What's New", exact: true }).waitFor({ timeout: 3000 });
    if (!check(await fresh())) throw new Error(`after marking seen, new: ${JSON.stringify(await fresh())}`);
    await t.snap(p, "whats-new");

    // Music is the releases, Comments the rest.
    const chip = (name) => main(p).getByRole("button", { name, exact: true });
    await chip("Music").click();
    if ((await chip("Music").getAttribute("aria-pressed")) !== "true") throw new Error("Music isn't shown as on");
    await until(p, () => [...document.querySelectorAll(".whats-new-list > li")].every((li) => li.querySelector(".whats-new-play")), "Music shows more than releases");
    if ((await items(p).count()) !== 2) throw new Error(`Music shows ${await items(p).count()} rows`);
    await t.snap(p, "whats-new-music");
    await chip("Comments").click();
    await until(p, () => !document.querySelector(".whats-new-play"), "Comments shows releases");
    await items(p).filter({ hasText: anaReplies }).waitFor({ timeout: 3000 });
    await chip("All").click();
    await releases(p).first().waitFor({ timeout: 3000 });
    await p.reload({ waitUntil: "networkidle" });
    await items(p).filter({ hasText: anaSays }).waitFor({ timeout: 3000 });
    if (await dotted(p).count()) throw new Error("still new on the next visit");
  }],
  // A release's play button starts its album.
  ["notifications-play", "/whats-new", async (p) => {
    const sent = p.waitForRequest((r) => r.method() === "PUT" && new URL(r.url()).pathname === "/v1/me/player/play", { timeout: 3000 });
    await main(p).getByRole("button", { name: "Play Single Three", exact: true }).click();
    const body = (await sent).postDataJSON();
    if (body?.context_uri !== album3.uri) throw new Error(`play sent ${JSON.stringify(body)}`);
    if ((await items(p).filter({ hasText: "Single Three" }).getByRole("link", { name: "Single Three" }).getAttribute("href")) !== "/album/al3") throw new Error("the title doesn't lead to the album");
  }],
  // Each comment item's song leads to its comments; a reply's lands on the reply, in view and lit up.
  ["notifications-to-song", "/whats-new", async (p) => {
    for (const text of [anaSays, victorSays, anaReplies])
      if ((await items(p).filter({ hasText: text }).getByRole("link").getAttribute("href")) !== `/comments/${bell.id}`) throw new Error(`"${text}" doesn't lead to its song`);
    await items(p).filter({ hasText: anaReplies }).getByRole("link").click();
    await p.waitForURL(`**/comments/${bell.id}`);
    // In the song's comments: What's New's row has the same text while the page changes.
    const landed = p.getByRole("region", { name: "Comments" }).getByRole("article").filter({ hasText: anaReplies });
    await landed.waitFor({ timeout: 3000 });
    const [rect, view] = await Promise.all([landed.boundingBox(), main(p).boundingBox()]);
    if (rect.y < view.y || rect.y + rect.height > view.y + view.height) throw new Error(`the reply at y=${rect.y} isn't in view (${view.y} to ${view.y + view.height})`);
    if ((await landed.evaluate((el) => getComputedStyle(el).animationName)) !== "comment-highlight") throw new Error("the reply isn't lit up");
  }],
  // Each artist's releases are asked for once, whoever needs them (the bell and the page), and then come from the cache.
  ["notifications-cache", "/", async (p, t) => {
    const asked = [];
    p.on("request", (r) => {
      const url = new URL(r.url());
      if (/^\/v1\/artists\/\w+\/albums$/.test(url.pathname) && url.searchParams.get("include_groups") === "album,single" && url.searchParams.get("limit") === "10") asked.push(url.pathname);
    });
    await p.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("shoutify:releases:")).forEach((key) => localStorage.removeItem(key)));
    await p.goto(t.base + "/whats-new", { waitUntil: "networkidle" });
    await releases(p).first().waitFor({ timeout: 3000 });
    if (asked.sort().join() !== "/v1/artists/ar1/albums,/v1/artists/ar2/albums") throw new Error(`asked for ${JSON.stringify(asked)}`);
    asked.length = 0;
    await p.reload({ waitUntil: "networkidle" });
    await releases(p).first().waitFor({ timeout: 3000 });
    if (asked.length) throw new Error(`asked again for ${JSON.stringify(asked)}`);
  }],

  // friends.mjs's comment-flow-whats-new: from the player's Comment button to the song's page, with its author; What's New
  // leaves your own comments out.
  ["comment-flow-own", "/", async (p, t) => {
    await p.getByRole("button", { name: "Comment", exact: true }).click();
    await p.getByRole("textbox", { name: "Comment", exact: true }).fill("my own drop");
    await p.getByRole("button", { name: "Post", exact: true }).click();
    await commentRow(p, "my own drop").getByText("Victor", { exact: true }).waitFor({ timeout: 5000 });
    await p.goto(t.base + "/whats-new", { waitUntil: "networkidle" });
    await items(p).first().waitFor({ timeout: 3000 });
    if (await main(p).getByText("my own drop").count()) throw new Error("your own comment is in What's New");
  }],
  // friends.mjs's reply-from-whats-new-page, in Social: Like works in place, and Reply leads to the comment on its song's
  // page, scrolled to and lit up, with its composer open.
  ["reply-from-social", "/social", async (p, t) => {
    const target = "reply to this one from Social";
    await comment(t, "Ana", target, { songID: far.id });
    for (let n = 1; n <= 8; n++) await comment(t, "Bo", `a newer one, number ${n}`, { songID: far.id });
    await p.reload({ waitUntil: "networkidle" });
    const like = likeButton(commentRow(p, target));
    await like.click();
    await settles(p, () => likeState(like), "true 1", "the like in Social");
    await t.snap(p, "social-actions");
    await replyButton(commentRow(p, target)).click();
    await p.waitForURL(`**/comments/${far.id}`);
    await hasFocus(replyBox(p), "the reply box");
    await composer(p).getByText("Replying to Ana", { exact: true }).waitFor({ timeout: 3000 });
    if (!(await thread(p, target).locator(".reply-composer").count())) throw new Error("the composer isn't under the comment");
    const landed = commentRow(p, target);
    const [rect, view] = await Promise.all([landed.boundingBox(), main(p).boundingBox()]);
    if (rect.y < view.y || rect.y + rect.height > view.y + view.height) throw new Error(`the comment at y=${rect.y} isn't in view (${view.y} to ${view.y + view.height})`);
    if ((await landed.evaluate((el) => getComputedStyle(el).animationName)) !== "comment-highlight") throw new Error("the comment isn't lit up");
  }],
];
