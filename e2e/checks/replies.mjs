// Liking comments and replying to them, Twitter style: Reply and Like under every comment, and on a song's page each
// comment's replies under it, oldest first, with a composer that opens there. Ana and Bo comment, reply and like as
// themselves: run.sh signs the server's author cookies with CLIENT_SECRET=y, so the checks can sign theirs.
import { createHmac } from "node:crypto";
import { listed, track } from "../data.mjs";
import { hasFocus } from "./comments.mjs";

const song = { ...track, id: "ThreadTrack00000000000", name: "Thread Track", uri: "spotify:track:ThreadTrack00000000000" };
const far = { ...track, id: "FarDownTrack0000000000", name: "Far Down", uri: "spotify:track:FarDownTrack0000000000" };
const playing = listed[3];
export const fixtures = { [`/v1/tracks/${song.id}`]: song, [`/v1/tracks/${far.id}`]: far };

// POSTs to Shoutify's API as `name`.
export async function as(t, name, path, body) {
  const data = Buffer.from(JSON.stringify({ id: name.toLowerCase(), name, image: null, issued: Date.now() })).toString("base64url");
  const cookie = `author=${data}.${createHmac("sha256", "y").update(data).digest("base64url")}`;
  const response = await fetch(`${t.base}/api${path}`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${name}'s POST ${path} answered ${response.status}`);
  return response.status === 204 ? null : response.json();
}
const comment = async (t, name, commentBody, more = {}) => (await as(t, name, "/comments/add", { songID: song.id, commentBody, timestamp: 61000, ...more })).comment;

const main = (p) => p.getByRole("main");
const row = (p, text) => main(p).getByRole("article").filter({ hasText: text });
const thread = (p, text) => main(p).locator(".thread").filter({ hasText: text });
const replyButton = (row) => row.getByRole("button", { name: "Reply", exact: true });
const likeButton = (row) => row.getByRole("button", { name: "Like", exact: true });
const box = (p) => p.getByRole("textbox", { name: "Reply", exact: true });
const composer = (p) => main(p).locator(".reply-composer");
const posted = (p) => p.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/comments/add"), { timeout: 3000 });
const green = "rgb(30, 215, 96)";

// Waits (up to 3 s) for `read()` to give `want`.
async function settles(p, read, want, what) {
  let got;
  for (let i = 0; i < 30 && (got = await read()) !== want; i++) await p.waitForTimeout(100);
  if (got !== want) throw new Error(`${what}: ${JSON.stringify(got)}, not ${JSON.stringify(want)}`);
}
// A Like button's state: pressed or not, and the count beside the heart.
const likeState = async (button) => `${await button.getAttribute("aria-pressed")} ${await button.innerText()}`.trim();
// For friends.mjs's copy of reply-from-whats-new.
export { comment, far, main, row, thread, replyButton, likeButton, box, composer, settles, likeState };

// The thread the checks build on Thread Track: Ana's comment at 1:01, which Bo likes, and Bo's newer one.
const ana = "the bassline at 1:01 is unreal", bo = "this chorus though";
let anaComment;

export const checks = [
  // Like and unlike: the heart fills in green at once, the count beside it counts everyone's likes, and it's yours
  // after a reload.
  ["like-comment", `/comments/${song.id}`, async (p, t) => {
    anaComment = await comment(t, "Ana", ana);
    await as(t, "Bo", `/comments/${anaComment.id}/like`, { liked: true });
    await comment(t, "Bo", bo, { timestamp: 130000 });
    await p.reload({ waitUntil: "networkidle" });
    const like = likeButton(row(p, ana));
    await settles(p, () => likeState(like), "false 1", "before liking, Bo's like");
    for (const [liked, want] of [[true, "true 2"], [false, "false 1"], [true, "true 2"]]) {
      const sent = p.waitForRequest((r) => r.url().endsWith(`/api/comments/${anaComment.id}/like`), { timeout: 3000 });
      await like.click();
      if (JSON.stringify((await sent).postDataJSON()) !== JSON.stringify({ liked })) throw new Error(`sent ${(await sent).postData()}`);
      await settles(p, () => likeState(like), want, liked ? "liked" : "unliked");
      // Green when liked; otherwise white, as the pointer is still over it.
      await settles(p, () => like.evaluate((el) => getComputedStyle(el).color), liked ? green : "rgb(255, 255, 255)", "the heart's colour");
      if ((await like.locator("path").getAttribute("fill")) !== (liked ? "currentColor" : "none")) throw new Error(`the heart isn't ${liked ? "filled" : "empty"}`);
    }
    await p.reload({ waitUntil: "networkidle" });
    await settles(p, () => likeState(likeButton(row(p, ana))), "true 2", "after a reload, the like");
  }],
  // The heart fills at once; when the server turns it down it empties again and says so.
  ["like-comment-fails", `/comments/${song.id}`, async (p) => {
    const like = likeButton(row(p, bo));
    await settles(p, () => likeState(like), "false", "Bo's comment, unliked");
    let answer;
    const held = new Promise((resolve) => (answer = resolve));
    await p.route("**/api/comments/*/like", async (r) => { await held; await r.fulfill({ status: 502, contentType: "text/plain", body: "Bad Gateway" }); });
    await like.click();
    await settles(p, () => likeState(like), "true 1", "while the server answers, the like");
    answer();
    await p.getByText("ERROR: could not like it (Shoutify answered 502)").waitFor({ timeout: 3000 });
    await settles(p, () => likeState(like), "false", "after the failure, the like");
  }],
  // Reply opens a composer under the thread with focus in it; a failed save keeps the text, and the reply goes under the
  // comment, lined up with its text, without a moment in the song, with the comment's reply count at 1. Focus goes back
  // to the Reply button.
  ["reply-post", `/comments/${song.id}`, async (p, t) => {
    const parent = row(p, ana);
    await replyButton(parent).click();
    await hasFocus(box(p), "the reply box");
    await composer(p).getByText("Replying to Ana", { exact: true }).waitFor({ timeout: 3000 });
    if ((await box(p).getAttribute("placeholder")) !== "Post your reply") throw new Error(`placeholder "${await box(p).getAttribute("placeholder")}"`);
    if (!(await thread(p, ana).locator(".reply-composer").count())) throw new Error("the composer isn't under Ana's thread");
    await box(p).fill("the synth under it too");
    await t.snap(p, "reply-composer");
    await p.route("**/api/comments/add", (r) => r.fulfill({ status: 502, contentType: "text/plain", body: "Bad Gateway" }));
    await composer(p).getByRole("button", { name: "Reply", exact: true }).click();
    await p.getByText("ERROR: could not save it (Shoutify answered 502)").waitFor({ timeout: 3000 });
    if ((await box(p).inputValue()) !== "the synth under it too") throw new Error("the reply was lost after a failed save");
    await p.unroute("**/api/comments/add");
    const sent = posted(p);
    await box(p).press("Control+Enter");
    const body = (await sent).postDataJSON();
    if (body.parentID !== anaComment.id || "timestamp" in body) throw new Error(`sent ${JSON.stringify(body)}`);
    const reply = row(p, "the synth under it too");
    await reply.waitFor({ timeout: 3000 });
    await box(p).waitFor({ state: "detached", timeout: 3000 });
    await hasFocus(replyButton(parent), "Ana's Reply button");
    if ((await thread(p, ana).getByRole("article").allInnerTexts()).findIndex((text) => text.includes("the synth")) !== 1) throw new Error("the reply isn't right under Ana's comment");
    if (await reply.getByText("1:01").count()) throw new Error("the reply shows a moment in the song");
    const [text, picture] = await Promise.all([parent.locator(".comment-main").boundingBox(), reply.locator(".avatar").boundingBox()]);
    if (Math.abs(picture.x - text.x) > 1 || Math.round(picture.width) !== 32) throw new Error(`the reply's picture is at ${JSON.stringify(picture)}, Ana's text at x=${text.x}`);
    await settles(p, () => replyButton(parent).innerText(), "1", "Ana's reply count");
  }],
  // Replying to a reply opens its thread's composer (there's one at a time) starting "@Victor ", and the reply goes in the
  // thread, after the older one. Escape closes the composer, back to the Reply button.
  ["reply-to-reply", `/comments/${song.id}`, async (p) => {
    const mine = row(p, "the synth under it too");
    await replyButton(row(p, bo)).click();
    await replyButton(mine).click();
    await hasFocus(box(p), "the reply box");
    if ((await box(p).count()) !== 1) throw new Error(`${await box(p).count()} reply composers open`);
    if ((await box(p).inputValue()) !== "@Victor ") throw new Error(`the reply box starts "${await box(p).inputValue()}"`);
    if (!(await thread(p, ana).locator(".reply-composer").count())) throw new Error("the composer isn't in the reply's thread");
    await p.keyboard.type("and the hi-hats");
    const sent = posted(p);
    await composer(p).getByRole("button", { name: "Reply", exact: true }).click();
    const body = (await sent).postDataJSON();
    if (body.parentID !== anaComment.id || body.commentBody !== "@Victor and the hi-hats") throw new Error(`sent ${JSON.stringify(body)}`);
    await row(p, "@Victor and the hi-hats").waitFor({ timeout: 3000 });
    const texts = await thread(p, ana).getByRole("article").allInnerTexts();
    if (!texts[1]?.includes("the synth") || !texts[2]?.includes("hi-hats")) throw new Error(`the thread reads ${JSON.stringify(texts)}`);
    await replyButton(mine).click();
    await box(p).press("Escape");
    await box(p).waitFor({ state: "detached", timeout: 3000 });
    await hasFocus(replyButton(mine), "the reply's Reply button");
  }],
  // A thread of a few replies, some liked, for the screenshot.
  ["reply-thread", `/comments/${song.id}`, async (p, t) => {
    const synth = (await row(p, "the synth under it too").getAttribute("id")).replace("comment-", "");
    await as(t, "Ana", `/comments/${synth}/like`, { liked: true });
    await comment(t, "Bo", "agreed, it carries the whole track", { parentID: anaComment.id });
    await p.reload({ waitUntil: "networkidle" });
    await row(p, "it carries the whole track").waitFor({ timeout: 3000 });
    await settles(p, () => likeState(likeButton(row(p, "the synth under it too"))), "false 1", "Ana's like on the reply");
    await thread(p, ana).evaluate((el) => el.scrollIntoView({ block: "center" }));
  }],
  // What's New has the same row: Like works in place, and Reply leads to the comment on its song's page, scrolled to and
  // lit up, with its composer open.
  ["reply-from-whats-new", "/social", async (p, t) => {
    const target = "reply to this one from What's New";
    await comment(t, "Ana", target, { songID: far.id });
    for (let n = 1; n <= 8; n++) await comment(t, "Bo", `a newer one, number ${n}`, { songID: far.id });
    await p.reload({ waitUntil: "networkidle" });
    const like = likeButton(row(p, target));
    await like.click();
    await settles(p, () => likeState(like), "true 1", "the like in What's New");
    await t.snap(p, "whats-new-actions");
    await replyButton(row(p, target)).click();
    await p.waitForURL(`**/comments/${far.id}`);
    await hasFocus(box(p), "the reply box");
    await composer(p).getByText("Replying to Ana", { exact: true }).waitFor({ timeout: 3000 });
    if (!(await thread(p, target).locator(".reply-composer").count())) throw new Error("the composer isn't under the comment");
    const landed = row(p, target);
    const [rect, view] = await Promise.all([landed.boundingBox(), main(p).boundingBox()]);
    if (rect.y < view.y || rect.y + rect.height > view.y + view.height) throw new Error(`the comment at y=${rect.y} isn't in view (${view.y} to ${view.y + view.height})`);
    if ((await landed.evaluate((el) => getComputedStyle(el).animationName)) !== "comment-highlight") throw new Error("the comment isn't lit up");
  }],
  // The Now playing view's card keeps to the newest three top-level comments, now that a song's comments include replies.
  ["reply-npv-card", "/", async (p, t) => {
    const top = await comment(t, "Ana", "the newest top-level comment", { songID: playing.id });
    for (const n of [1, 2, 3]) await comment(t, "Bo", `a reply the card leaves out ${n}`, { songID: playing.id, parentID: top.id });
    await p.reload({ waitUntil: "networkidle" });
    const view = p.getByRole("complementary", { name: "Now playing view" });
    const comments = view.locator(".npv-comment-list").getByRole("listitem");
    await comments.first().getByText("the newest top-level comment").waitFor({ timeout: 3000 });
    if (await view.getByText("a reply the card leaves out").count()) throw new Error("the card shows replies");
    if ((await comments.count()) !== 3) throw new Error(`${await comments.count()} comments in the card`);
  }],
];
