// A song's comment page: the Comment buttons land in its composer, whose green chip is the moment in the song the
// comment is about, over a Twitter-like timeline, newest first. The fake session plays Listed 3 (3:20 long) on
// "Victor's iPhone" from 1 s in; the player asks Spotify again every 5 s, which puts it back at 1 s.
import { img, listed, track, track2 } from "../data.mjs";
import { inBrowser, sdkState } from "./review-fixes-player.mjs";

const playing = listed[3];
export const fixtures = { [`/v1/tracks/${playing.id}`]: playing };

// The checks that wrote through the Add Comment dialog or used the Annotations button, here on the comment page.
export const replaces = [
  "comment-save-fails", "player-npv-comments", "player-friend-activity", "song-comments-page", "comment-flow-page",
  "player-comment-song", "player-episode",
];

const main = (p) => p.getByRole("main");
const timeline = (p) => p.getByRole("region", { name: "Comments" });
const box = (p) => p.getByRole("textbox", { name: "Comment", exact: true });
const chip = (p) => p.getByRole("button", { name: /^Comment timestamp / });
const editor = (p) => p.getByRole("textbox", { name: "Comment timestamp" });
const post = (p) => p.getByRole("button", { name: "Post", exact: true });
const seeks = (t) => t.sent.filter((c) => c.startsWith("PUT /v1/me/player/seek"));
const green = "rgb(30, 215, 96)";
// m:ss, as the page shows song positions.
const mss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

// Waits (up to 3 s) for the locator's element to have keyboard focus.
async function hasFocus(locator, what) {
  const el = await locator.elementHandle({ timeout: 3000 });
  await locator.page().waitForFunction((el) => el === document.activeElement, el, { timeout: 3000 })
    .catch(() => { throw new Error(`${what} doesn't have focus`); });
}

// Requests reach t.sent a moment after the click that sends them.
async function until(p, done, failure) {
  for (let i = 0; i < 20 && !done(); i++) await p.waitForTimeout(100);
  if (!done()) throw new Error(failure());
}

export const checks = [
  // The player's Comment button opens the playing song's page with focus in the composer, also from that page itself
  // (which it doesn't add to the history again). The Annotations button is gone.
  ["comment-button", "/", async (p) => {
    if (await p.locator(".player").getByRole("button", { name: /annotat/i }).count()) throw new Error("the player bar still has an Annotations button");
    const comment = p.getByRole("button", { name: "Comment", exact: true });
    await comment.click();
    await p.waitForURL(`**/comments/${playing.id}`);
    await main(p).getByRole("heading", { name: playing.name, exact: true }).waitFor({ timeout: 3000 });
    await hasFocus(box(p), "the composer");
    await box(p).blur();
    await comment.click();
    await hasFocus(box(p), "the composer, from its own page,");
    await p.goBack();
    await p.waitForURL((url) => url.pathname === "/", { timeout: 3000 })
      .catch(() => { throw new Error(`Back went to ${p.url()}, not home`); });
  }],
  // While the page's song plays, the chip follows it until you write; it's green and sits in front of the first line.
  ["comment-chip-follows", `/comments/${playing.id}`, async (p) => {
    const button = chip(p);
    await button.waitFor({ timeout: 3000 });
    const first = await button.innerText();
    if (!/^0:0\d$/.test(first)) throw new Error(`the chip shows ${first}`);
    await p.waitForFunction((first) => document.querySelector("button.time-chip")?.textContent !== first, first, { timeout: 3000 })
      .catch(() => { throw new Error(`the chip stayed at ${first} while the song played`); });
    await box(p).pressSequentially("pinned here");
    const pinned = await button.innerText();
    await p.waitForTimeout(2500);
    if ((await button.innerText()) !== pinned) throw new Error(`the chip moved on from ${pinned} after typing`);
    // Longer text wraps under the chip, and the box grows with it.
    const oneLine = (await box(p).boundingBox()).height;
    await box(p).fill("pinned here, where the bass comes in under the vocals and the whole room shakes, then drops out for two bars before the chorus\nand a second paragraph");
    if ((await box(p).boundingBox()).height < oneLine * 2) throw new Error("the comment box didn't grow with the text");
    if ((await button.evaluate((el) => getComputedStyle(el).backgroundColor)) !== green) throw new Error("the chip isn't green");
    const [c, b] = await Promise.all([button.boundingBox(), box(p).boundingBox()]);
    const indent = await box(p).evaluate((el) => parseFloat(getComputedStyle(el).textIndent));
    if (Math.abs(c.x - b.x) > 1 || c.y < b.y || c.y + c.height > b.y + 34 || indent < c.width)
      throw new Error(`the chip at ${JSON.stringify(c)} isn't in front of the first line of ${JSON.stringify(b)} (indent ${indent})`);
  }],
  // Setting the chip: times past the song's end or not m:ss / h:mm:ss are turned down with the range, and send no seek;
  // Escape leaves it; a valid time pins it and moves playback there.
  ["comment-chip-seek", `/comments/${playing.id}`, async (p, t) => {
    t.sent.length = 0;
    await chip(p).click();
    await hasFocus(editor(p), "the chip's editor");
    for (const bad of ["", "1:5", "1:60", "abc", "-0:01", "3:21"]) {
      await editor(p).fill(bad);
      await editor(p).press("Enter");
      const alert = main(p).getByRole("alert");
      await alert.waitFor({ timeout: 3000 }).catch(() => { throw new Error(`no alert for "${bad}"`); });
      if ((await alert.innerText()) !== "Enter a time from 0:00 to 3:20") throw new Error(`alert for "${bad}": ${await alert.innerText()}`);
      if ((await editor(p).getAttribute("aria-invalid")) !== "true") throw new Error(`"${bad}" isn't marked invalid`);
    }
    await t.snap(p, "comment-chip-invalid");
    await editor(p).press("Escape");
    await hasFocus(chip(p), "the chip, after Escape,");
    await chip(p).click();
    await editor(p).fill("1:30");
    await editor(p).press("Enter");
    await hasFocus(chip(p), "the chip, after Enter,");
    if ((await chip(p).innerText()) !== "1:30") throw new Error(`the chip shows ${await chip(p).innerText()}`);
    if (await main(p).getByRole("alert").count()) throw new Error("the alert stayed");
    await until(p, () => seeks(t).length > 0, () => `no seek sent: ${JSON.stringify(t.sent)}`);
    if (seeks(t).join() !== "PUT /v1/me/player/seek?position_ms=90000") throw new Error(`seeks sent: ${JSON.stringify(seeks(t))}`);
    // The end of the song is in range.
    await chip(p).click();
    await editor(p).fill("3:20");
    await editor(p).press("Enter");
    await until(p, () => seeks(t).length > 1, () => `no seek to the end: ${JSON.stringify(seeks(t))}`);
    if (seeks(t)[1] !== "PUT /v1/me/player/seek?position_ms=200000") throw new Error(`seeks sent: ${JSON.stringify(seeks(t))}`);
  }],
  // On a song that isn't loaded the chip sits at 0:00 and setting it moves nothing. Posts go first in the timeline (Post
  // or Ctrl+Enter), with the author, the moment in green and how long ago, and the composer empties.
  ["comment-post-newest", `/comments/${track.id}`, async (p, t) => {
    t.sent.length = 0;
    await chip(p).waitFor({ timeout: 3000 });
    if ((await chip(p).innerText()) !== "0:00") throw new Error(`the chip shows ${await chip(p).innerText()} for a song that isn't loaded`);
    await chip(p).click();
    await editor(p).fill("0:42");
    await editor(p).press("Enter");
    await box(p).fill("first of two");
    await post(p).click();
    const rows = timeline(p).getByRole("article");
    await rows.first().getByText("first of two").waitFor({ timeout: 3000 });
    if ((await box(p).inputValue()) !== "") throw new Error("the composer kept the text");
    if ((await chip(p).innerText()) !== "0:00") throw new Error("the chip didn't go back to following playback");
    await box(p).fill("second of\ntwo");
    await box(p).press("Control+Enter");
    await rows.first().getByText("second of").waitFor({ timeout: 3000 });
    if (!(await rows.nth(1).innerText()).includes("first of two")) throw new Error("not newest first");
    if (seeks(t).length) throw new Error(`seeked while another song plays: ${seeks(t)}`);
    const newest = rows.first();
    if (!(await newest.innerText()).includes("second of\ntwo")) throw new Error("the line break was lost");
    await newest.getByText("Victor", { exact: true }).waitFor({ timeout: 3000 });
    const at = newest.getByText("0:00", { exact: true }), atFirst = rows.nth(1).getByText("0:42", { exact: true });
    for (const moment of [at, atFirst]) {
      if ((await moment.evaluate((el) => getComputedStyle(el).color)) !== green) throw new Error("the moment in the song isn't green");
      if ((await moment.evaluate((el) => el.tagName)) === "BUTTON") throw new Error("the moment in the song is a button");
    }
    const posted = newest.locator("time");
    if (!/^(now|\d+s)$/.test(await posted.innerText())) throw new Error(`posted "${await posted.innerText()}"`);
    if (!(await posted.getAttribute("title"))?.includes(new Date().getFullYear())) throw new Error("no full date and time on hover");
    await t.snap(p, "comment-page");
  }],
  // smoke.mjs's comment-save-fails: a failed save keeps the text, and Post needs real text.
  ["composer-save-fails", `/comments/${track.id}`, async (p, t) => {
    const button = post(p);
    await box(p).waitFor({ timeout: 3000 });
    if (!(await button.isDisabled())) throw new Error("Post enabled with no text");
    await box(p).fill("   ");
    if (!(await button.isDisabled())) throw new Error("Post enabled for whitespace");
    if ((await box(p).getAttribute("maxlength")) !== "2000") throw new Error("comment box has no maxlength");
    await box(p).fill("keep me");
    await t.snap(p, "composer");
    await p.route("**/api/comments/add", (r) => r.fulfill({ status: 502, contentType: "text/plain", body: "Bad Gateway" }));
    await button.click();
    await p.getByText("ERROR: could not save it").waitFor({ timeout: 3000 });
    if ((await box(p).inputValue()) !== "keep me") throw new Error("text lost after a failed save");
    await p.unroute("**/api/comments/add");
    await button.click();
    await timeline(p).getByRole("article").first().getByText("keep me").waitFor({ timeout: 3000 });
    if ((await box(p).inputValue()) !== "") throw new Error("the composer kept the text after saving");
  }],
  // player.mjs's player-npv-comments: no comments yet, the Now playing view says so and "Add a comment" opens the
  // composer; a new one shows in the view at once, newest first and saying who wrote it, and Show all leads to the rest.
  ["npv-add-comment", "/", async (p, t) => {
    const view = p.getByRole("complementary", { name: "Now playing view" });
    await p.route("**/api/comments/song/**", (r) => r.fulfill({ json: { comments: [] } }));
    await p.reload({ waitUntil: "networkidle" });
    await view.getByText("No one's commented thus far. Be the first!").waitFor({ timeout: 3000 });
    await t.snap(p, "now-playing-view-no-comments");
    await view.getByRole("button", { name: "Add a comment" }).click();
    await p.waitForURL(`**/comments/${playing.id}`);
    await hasFocus(box(p), "the composer");
    await p.unroute("**/api/comments/song/**");
    await box(p).fill("from the now playing view");
    await post(p).click();
    const newest = view.getByRole("listitem").first();
    await newest.getByText("from the now playing view").waitFor({ timeout: 3000 });
    if (!(await newest.getByText("Victor", { exact: true }).count())) throw new Error("the comment doesn't say who wrote it");
    if ((await view.getByRole("listitem").count()) > 3) throw new Error("more than three comments in the card");
    if ((await view.getByRole("link", { name: "Show all" }).getAttribute("href")) !== `/comments/${playing.id}`) throw new Error("Show all doesn't lead to the song's comments");
  }],
  // player.mjs's player-friend-activity: a new comment tops Friend Activity, with who, what, and the song.
  ["comment-friend-activity", "/", async (p) => {
    try {
      await p.getByRole("button", { name: "Comment", exact: true }).click();
      await box(p).fill("for friend activity");
      await post(p).click();
      await timeline(p).getByRole("article").first().getByText("for friend activity").waitFor({ timeout: 3000 });
      await p.getByRole("button", { name: "Friend Activity" }).click();
      const newest = p.getByRole("complementary", { name: "Friend Activity" }).getByRole("listitem").first();
      await newest.getByText("for friend activity").waitFor({ timeout: 3000 });
      await newest.getByText("Victor", { exact: true }).waitFor({ timeout: 3000 });
      const song = newest.getByRole("link");
      if ((await song.getAttribute("href")) !== `/comments/${playing.id}` || !(await song.innerText()).startsWith(playing.name)) throw new Error(`song link: ${await song.innerText()}`);
    } finally {
      await p.evaluate(() => localStorage.removeItem("shoutify:right-panel"));
    }
  }],
  // player.mjs's song-comments-page: the track table counts comments, and a comment posted on the page shows there.
  ["song-comments-composer", "/playlist/p1", async (p, t) => {
    await p.getByRole("button", { name: /Comments on Listed 0 \(0\)/ }).waitFor({ timeout: 3000 });
    await p.goto(t.base + `/comments/${track.id}`, { waitUntil: "networkidle" });
    await box(p).fill("from the song page");
    await post(p).click();
    await timeline(p).getByText("from the song page").first().waitFor({ timeout: 3000 });
    if (await main(p).getByText("No one's commented thus far").count()) throw new Error("empty state still shown");
  }],
  // player.mjs's comment-flow-page: from the player's Comment button to What's New, with its author.
  ["comment-flow-social", "/", async (p, t) => {
    await p.getByRole("button", { name: "Comment", exact: true }).click();
    await box(p).fill("nice drop");
    await post(p).click();
    await timeline(p).getByText("nice drop").first().waitFor({ timeout: 5000 });
    await p.goto(t.base + "/social", { waitUntil: "networkidle" });
    await main(p).getByText("nice drop").first().waitFor({ timeout: 5000 });
    if (!(await main(p).getByText("Victor", { exact: true }).count())) throw new Error("comment has no author");
  }],
  // review-fixes-player.mjs's player-comment-song: the comment stays on the song (and moment) it was started on, even
  // when the next song starts.
  ["comment-keeps-its-song", "/", async (p, t) => {
    await inBrowser(p, t);
    const first = t.fixtures["/v1/me/player"].item;
    await p.getByRole("button", { name: "Comment", exact: true }).click();
    await box(p).fill("about the first song");
    const moment = await chip(p).innerText();
    await sdkState(p, track2);
    await p.waitForFunction((name) => document.title.startsWith(name), track2.name, { timeout: 3000 });
    if (new URL(p.url()).pathname !== `/comments/${first.id}`) throw new Error(`moved on to ${p.url()}`);
    if ((await chip(p).innerText()) !== moment) throw new Error(`the chip went from ${moment} to ${await chip(p).innerText()}`);
    let posted;
    await p.route("**/api/comments/add", (r) => { posted = r.request().postDataJSON(); return r.fulfill({ json: {} }); });
    await post(p).click();
    await p.waitForFunction(() => document.querySelector("textarea[aria-label=Comment]")?.value === "", null, { timeout: 3000 });
    if (posted?.songID !== first.id || mss(posted.timestamp) !== moment) throw new Error(`saved on ${posted?.songID} at ${posted?.timestamp}, not ${first.id} at ${moment}`);
  }],
  // review-fixes-player.mjs's player-episode: Spotify leaves an episode out (item: null) unless asked for episodes, and
  // only songs on Spotify can be commented on.
  ["player-episode-comment", "/", async (p, t) => {
    const episode = { id: "Episode000000000000001", type: "episode", uri: "spotify:episode:Episode000000000000001", name: "Episode One", duration_ms: 1800000, images: img(5) };
    await p.route((url) => url.pathname === "/v1/me/player", (r) => r.fulfill({ json: {
      ...t.fixtures["/v1/me/player"], context: null, currently_playing_type: "episode",
      item: new URL(r.request().url()).searchParams.get("additional_types")?.split(",").includes("episode") ? episode : null,
    } }));
    await p.reload({ waitUntil: "networkidle" });
    await p.waitForFunction((name) => document.title.startsWith(name), episode.name, { timeout: 3000 });
    const name = "Podcasts and local files can't be commented on";
    if (!(await p.getByRole("button", { name, exact: true }).isDisabled({ timeout: 3000 }).catch(() => false))) throw new Error(`no disabled "${name}" button`);
    if (await p.locator(".player").getByRole("button", { name: /annotat/i }).count()) throw new Error("the player bar has an Annotations button");
  }],
];
