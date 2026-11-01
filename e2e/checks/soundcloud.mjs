// The SoundCloud-style player at the top of a song's comment page: play, the title and artists on black labels, the
// album and year, the cover whole at the right, and the waveform, a slider that seeks (or starts the song there) with a
// marker per comment along it. While the song plays, the most popular comment about the last 4 s pops up in a bubble.
// The fake session plays Listed 3 (3:20) on "Victor's iPhone" from 1 s in; Wave Track (3:20 too) isn't playing.
import { album, artist, img, listed, track } from "../data.mjs";
import { hasFocus } from "./comments.mjs";
import { as } from "./replies.mjs";
import { inBrowser, sdkState } from "./review-fixes-player.mjs";

const song = { ...track, id: "WaveTrack0000000000000", name: "Wave Track", uri: "spotify:track:WaveTrack0000000000000", album: { ...album, images: img(40) } };
const playing = listed[3];
export const fixtures = { [`/v1/tracks/${song.id}`]: song };

const hero = (p) => p.getByRole("main").locator(".song-hero");
const wave = (p, name = song.name) => p.getByRole("slider", { name: `Seek ${name}`, exact: true });
const marker = (p, name) => hero(p).getByRole("button", { name, exact: true });
const bubble = (p) => hero(p).locator(".waveform-bubble");
const seeks = (t) => t.sent.filter((c) => c.startsWith("PUT /v1/me/player/seek"));
const post = async (t, name, commentBody, timestamp, more = {}) => (await as(t, name, "/comments/add", { songID: song.id, commentBody, timestamp, ...more })).comment;
const like = (t, name, comment) => as(t, name, `/comments/${comment.id}/like`, { liked: true });

// Waits (up to 3 s) for `done()`.
async function until(p, done, failure) {
  for (let i = 0; i < 30 && !(await done()); i++) await p.waitForTimeout(100);
  if (!(await done())) throw new Error(await failure());
}

// The cover is whole: drawn in its own proportions, square-cornered, with nothing over any part of it.
async function coverWhole(p, src) {
  const cover = hero(p).locator("img.song-hero-cover");
  if ((await cover.getAttribute("src")) !== src) throw new Error(`the cover is ${await cover.getAttribute("src")}`);
  const problem = await cover.evaluate(async (img) => {
    await img.decode();
    const r = img.getBoundingClientRect();
    if (Math.abs(r.width / r.height - img.naturalWidth / img.naturalHeight) > 0.01) return `drawn ${r.width}x${r.height} from ${img.naturalWidth}x${img.naturalHeight}`;
    for (const [x, y] of [[r.left + 1, r.top + 1], [r.right - 1, r.top + 1], [r.left + 1, r.bottom - 1], [r.right - 1, r.bottom - 1], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]]) {
      const hit = document.elementFromPoint(x, y);
      if (hit !== img) return `${hit?.className || hit?.tagName} at (${x}, ${y})`;
    }
    return null;
  });
  if (problem) throw new Error(`the cover isn't whole: ${problem}`);
}

// Clicks the middle of the waveform: the middle of the song.
const middle = (ms) => Math.abs(ms - song.duration_ms / 2) <= 1000;

export const checks = [
  // The hero: title, artists and album linked, the year, Play, the cover whole; the waveform at the start of a song that
  // isn't playing; a marker per top-level comment (not replies) at its moment, whose bubble shows on hover.
  ["soundcloud-hero", `/comments/${song.id}`, async (p, t) => {
    const ana = await post(t, "Ana", "this intro builds so well", 50000);
    await post(t, "Bo", "a reply has no marker", 0, { parentID: ana.id });
    await post(t, "Bo", "and here's the drop", 150000);
    await p.reload({ waitUntil: "networkidle" });
    await hero(p).getByRole("heading", { level: 1, name: song.name, exact: true }).waitFor({ timeout: 3000 });
    for (const [name, href] of [[artist.name, `/artist/${artist.id}`], [album.name, `/album/${album.id}`]]) {
      const link = hero(p).getByRole("link", { name, exact: true });
      if ((await link.getAttribute("href")) !== href) throw new Error(`${name} links to ${await link.getAttribute("href")}`);
    }
    await hero(p).getByText("2024", { exact: true }).waitFor({ timeout: 3000 });
    await hero(p).getByRole("button", { name: `Play ${song.name}`, exact: true }).waitFor({ timeout: 3000 });
    await coverWhole(p, song.album.images[0].url);
    if ((await wave(p).getAttribute("aria-valuetext")) !== "0:00 of 3:20") throw new Error(`the waveform says ${await wave(p).getAttribute("aria-valuetext")}`);
    const markers = hero(p).locator(".waveform-marker");
    if ((await markers.count()) !== 2) throw new Error(`${await markers.count()} markers for two comments and a reply`);
    for (const [name, at] of [["Ana at 0:50", 0.25], ["Bo at 2:30", 0.75]]) {
      const [m, w] = await Promise.all([marker(p, name).boundingBox(), wave(p).boundingBox()]);
      if (Math.abs(m.x + m.width / 2 - (w.x + w.width * at)) > 1) throw new Error(`${name} marker at x=${m.x + m.width / 2}, not ${w.x + w.width * at}`);
    }
    if (await bubble(p).count()) throw new Error("a bubble while nothing plays");
    if ((await marker(p, "Ana at 0:50").getAttribute("aria-description")) !== "this intro builds so well") throw new Error("the marker isn't described by its comment");
    await marker(p, "Ana at 0:50").hover();
    await bubble(p).filter({ hasText: "Ana" }).filter({ hasText: "this intro builds so well" }).waitFor({ timeout: 3000 });
    // It pops up, unless motion is reduced.
    if ((await bubble(p).evaluate((el) => getComputedStyle(el).animationName)) !== "waveform-pop") throw new Error("the bubble doesn't pop up");
    await p.emulateMedia({ reducedMotion: "reduce" });
    if ((await bubble(p).evaluate((el) => getComputedStyle(el).animationName)) !== "none") throw new Error("the bubble pops up though motion is reduced");
  }],
  // Two comments in the last 4 s: the more liked one is shouted out, not the newer one; a more liked comment coming in
  // takes over while the other is still in the window. Nothing while paused. This browser plays, so the SDK's events
  // set the playhead.
  ["soundcloud-shout-out", `/comments/${song.id}`, async (p, t) => {
    const liked = await post(t, "Ana", "the bass comes in right here", 100000);
    await post(t, "Bo", "newer, but no one likes it", 100500);
    const best = await post(t, "Cy", "and this is the best bit of the whole song: the synth under the chorus keeps climbing until everything drops out for a beat and comes back twice as loud", 103000);
    await like(t, "Bo", liked);
    await like(t, "Ana", best);
    await like(t, "Bo", best);
    await inBrowser(p, t);
    await sdkState(p, song, { position: 101500, paused: true });
    await p.waitForTimeout(600);
    if (await bubble(p).count()) throw new Error("a bubble while paused");
    await sdkState(p, song, { position: 101500 });
    await bubble(p).filter({ hasText: liked.commentBody }).waitFor({ timeout: 1000 })
      .catch(async () => { throw new Error(`shouted out "${await bubble(p).allInnerTexts()}", not the more liked comment`); });
    await bubble(p).filter({ hasText: best.commentBody }).waitFor({ timeout: 3000 })
      .catch(async () => { throw new Error(`shouted out "${await bubble(p).allInnerTexts()}" after 1:43, not the most liked comment`); });
    if ((await bubble(p).count()) !== 1) throw new Error(`${await bubble(p).count()} bubbles`);
    const lines = await bubble(p).locator("p").evaluate((el) => el.clientHeight / parseFloat(getComputedStyle(el).lineHeight));
    if (lines !== 2) throw new Error(`the bubble's text takes ${lines} lines, not two`);
    if (!(await marker(p, "Cy at 1:43").evaluate((el) => el.classList.contains("active")))) throw new Error("the shouted-out comment's marker isn't lit");
    await coverWhole(p, song.album.images[0].url);
  }],
  // On the playing song's page the waveform follows playback, and a click at its middle seeks to the middle of the song.
  ["soundcloud-seek", `/comments/${playing.id}`, async (p, t) => {
    await until(p, async () => /^0:0[1-9] of 3:20$/.test(await wave(p, playing.name).getAttribute("aria-valuetext")),
      async () => `the waveform says ${await wave(p, playing.name).getAttribute("aria-valuetext")} while the song plays`);
    t.sent.length = 0;
    await wave(p, playing.name).click();
    await until(p, () => seeks(t).length > 0, () => `no seek sent: ${JSON.stringify(t.sent)}`);
    if (seeks(t).length !== 1 || !middle(Number(seeks(t)[0].split("=")[1]))) throw new Error(`seeks sent: ${JSON.stringify(seeks(t))}`);
    if (t.sent.some((c) => c.startsWith("PUT /v1/me/player/play"))) throw new Error(`started the song again: ${JSON.stringify(t.sent)}`);
  }],
  // Keys, on the song paused at 0:01: ArrowRight seeks 5 s on, held it adds up and sends once, End and Home go to the ends.
  ["soundcloud-keys", `/comments/${playing.id}`, async (p, t) => {
    await p.route((url) => url.pathname === "/v1/me/player", (r) => r.request().method() === "GET"
      ? r.fulfill({ json: { ...t.fixtures["/v1/me/player"], is_playing: false } })
      : r.fallback());
    await p.reload({ waitUntil: "networkidle" });
    const slider = wave(p, playing.name);
    const atStart = () => until(p, async () => (await slider.getAttribute("aria-valuetext")) === "0:01 of 3:20",
      async () => `the waveform says ${await slider.getAttribute("aria-valuetext")}, not 0:01 of 3:20`);
    await atStart();
    t.sent.length = 0;
    await slider.press("ArrowRight");
    await until(p, () => seeks(t).length === 1, () => `seeks sent: ${JSON.stringify(seeks(t))}`);
    await atStart();
    for (let i = 0; i < 3; i++) await p.keyboard.down("ArrowRight");
    await p.keyboard.up("ArrowRight");
    await slider.press("End");
    await slider.press("Home");
    await until(p, () => seeks(t).length === 4, () => `seeks sent: ${JSON.stringify(seeks(t))}`);
    const sent = seeks(t).map((c) => c.split("=")[1]).join();
    if (sent !== "6000,16000,200000,0") throw new Error(`seeks sent for ArrowRight, held ArrowRight, End, Home: ${sent}`);
  }],
  // On a song that isn't playing, a click at the waveform's middle starts it there.
  ["soundcloud-start-here", `/comments/${song.id}`, async (p, t) => {
    t.sent.length = 0;
    const started = p.waitForRequest((r) => r.method() === "PUT" && new URL(r.url()).pathname === "/v1/me/player/play", { timeout: 3000 });
    await wave(p).click();
    const body = (await started).postDataJSON();
    if (JSON.stringify(body.uris) !== JSON.stringify([song.uri]) || !middle(body.position_ms)) throw new Error(`started ${JSON.stringify(body)}`);
    if (seeks(t).length) throw new Error(`seeked another song: ${JSON.stringify(seeks(t))}`);
    // The pointer's still over the middle, and the bars up to it are brighter.
    if ((await hero(p).locator(".waveform-bars").evaluate((el) => Math.round(parseFloat(el.style.getPropertyValue("--hover"))))) !== 50) throw new Error("no brighter bars up to the pointer");
  }],
  // A marker leads to its comment in the timeline, lit up, with focus on its Reply button.
  ["soundcloud-marker", `/comments/${song.id}`, async (p) => {
    await marker(p, "Ana at 0:50").click();
    const row = p.getByRole("main").getByRole("article").filter({ hasText: "this intro builds so well" });
    const [rect, view] = await Promise.all([row.boundingBox(), p.getByRole("main").boundingBox()]);
    if (rect.y < view.y || rect.y + rect.height > view.y + view.height) throw new Error(`the comment at y=${rect.y} isn't in view (${view.y} to ${view.y + view.height})`);
    if ((await row.evaluate((el) => getComputedStyle(el).animationName)) !== "comment-highlight") throw new Error("the comment isn't lit up");
    await hasFocus(row.getByRole("button", { name: "Reply", exact: true }), "the comment's Reply button");
  }],
  // In the narrowest window the cover moves up beside the title, and the waveform takes the band's whole width.
  ["soundcloud-narrow", `/comments/${song.id}`, async (p) => {
    await p.setViewportSize({ width: 768, height: 800 });
    await p.waitForTimeout(300);
    const [band, slider, title, cover] = await Promise.all([hero(p).locator(".song-hero-content"), wave(p), hero(p).getByRole("heading", { level: 1 }), hero(p).locator("img.song-hero-cover")]
      .map((part) => part.boundingBox()));
    if (Math.abs(slider.width - (band.width - 32)) > 1) throw new Error(`the waveform is ${slider.width}px wide in a ${band.width}px band`);
    if (cover.y + cover.height > slider.y || cover.x < title.x + title.width) throw new Error(`the cover at ${JSON.stringify(cover)} isn't beside the title, over the waveform`);
    await coverWhole(p, song.album.images[0].url);
  }],
];
