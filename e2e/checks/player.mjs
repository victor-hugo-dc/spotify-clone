// The right panel's three views, the player bar and the green "Playing on" bar under it. The fake session plays Listed 3
// from the playlist Mix on "Victor's iPhone", with the Now playing view open; checks that switch the panel, the window
// size or full screen put them back.
import { track } from "../data.mjs";

export const fixtures = {};

// smoke.mjs's versions look for comment text and buttons anywhere on the page, and now also find the playing song's
// comments (or its "No one's commented thus far" and "Add a comment") in the Now playing view. These look in the page.
export const replaces = ["comments-empty", "song-comments", "comment-flow"];

const panel = (p, name) => p.getByRole("complementary", { name });
// The right panel each viewer last chose is remembered; back to the default, the Now playing view.
const restorePanel = (p) => p.evaluate(() => localStorage.removeItem("shoutify:right-panel"));

// A Web Playback SDK that becomes ready as "dev-1", this browser's player.
const sdk = `window.Spotify = { Player: class {
  constructor() { this.listeners = {}; }
  addListener(event, cb) { this.listeners[event] = cb; return true; }
  connect() { setTimeout(() => this.listeners.ready({ device_id: "dev-1" }), 50); return Promise.resolve(true); }
  disconnect() {}
  activateElement() { return Promise.resolve(); }
} };
setTimeout(() => window.onSpotifyWebPlaybackSDKReady(), 0);`;

export const checks = [
  // Under the player while another device plays: green, 24px, naming it; it opens and closes the device picker.
  ["player-playing-on", "/", async (p, t) => {
    const bar = p.getByRole("button", { name: "Playing on Victor's iPhone", exact: true });
    await bar.waitFor({ timeout: 3000 });
    const [green, player] = await Promise.all([bar.boundingBox(), p.locator(".player").boundingBox()]);
    if (Math.round(green.height) !== 24 || green.y < player.y + player.height) throw new Error(`green bar at ${JSON.stringify(green)}, player at ${JSON.stringify(player)}`);
    await bar.click();
    await p.locator(".connect-devices").waitFor({ timeout: 3000 });
    if ((await bar.getAttribute("aria-expanded")) !== "true") throw new Error("the bar doesn't say the device picker is open");
    await p.waitForTimeout(400);
    await t.snap(p, "open-devices-from-bar");
    await bar.click();
    await p.locator(".connect-devices").waitFor({ state: "detached", timeout: 3000 });
  }],
  ["player-playing-here", "/", async (p, t) => {
    await p.route("https://sdk.scdn.co/**", (r) => r.fulfill({ contentType: "text/javascript", body: sdk }));
    await p.route((url) => url.pathname === "/v1/me/player", (r) => r.request().method() === "GET"
      ? r.fulfill({ json: { ...t.fixtures["/v1/me/player"], device: { id: "dev-1", name: "Spotify Clone Player", volume_percent: 50 } } })
      : r.fallback());
    await p.reload({ waitUntil: "networkidle" });
    await p.getByRole("button", { name: "Pause", exact: true }).waitFor({ timeout: 3000 });
    if (await p.getByRole("button", { name: /^Playing on/ }).count()) throw new Error("green bar while this browser plays");
  }],
  ["player-now-playing-view", "/", async (p, t) => {
    const { item } = t.fixtures["/v1/me/player"];
    const view = panel(p, "Now playing view");
    const toggle = p.getByRole("button", { name: "Now playing view", exact: true });
    try {
      await view.waitFor({ timeout: 3000 });
      // Headed by the playlist it plays from, then the big cover, the title (to the album, at the song) and the artist.
      if ((await view.getByRole("link", { name: "Mix", exact: true }).getAttribute("href")) !== "/playlist/p1") throw new Error("no header linking to the playlist it plays from");
      const cover = view.locator("img.npv-cover");
      if ((await cover.getAttribute("src")) !== item.album.images[0].url) throw new Error("not the song's cover");
      const box = await cover.boundingBox(), inside = await view.evaluate((aside) => aside.clientWidth);
      if (Math.round(box.width) !== Math.round(box.height) || Math.round(box.width) !== inside - 32) throw new Error(`cover is ${box.width}x${box.height} in a panel ${inside}px wide inside`);
      if ((await view.getByRole("link", { name: item.name, exact: true }).getAttribute("href")) !== `/album/${item.album.id}?highlight=${item.id}`) throw new Error("title doesn't link to the album");
      await view.getByRole("link", { name: "Artist One", exact: true }).first().waitFor({ timeout: 3000 });
      // The artist's card and what's next.
      await view.getByRole("heading", { name: "About the artist" }).waitFor({ timeout: 3000 });
      await view.getByText(t.fixtures["/v1/me/player/queue"].queue[0].name, { exact: true }).waitFor({ timeout: 3000 });
      await t.snap(p, "now-playing-view");
      await view.evaluate((aside) => aside.scrollTo(0, aside.scrollHeight));
      await t.snap(p, "now-playing-view-end");
      // Close, and the bar's button opens it again; that button shows whether it's open.
      if ((await toggle.getAttribute("aria-pressed")) !== "true") throw new Error("the Now playing view button isn't on");
      await view.getByRole("button", { name: "Close" }).click();
      await view.waitFor({ state: "detached", timeout: 3000 });
      if ((await toggle.getAttribute("aria-pressed")) !== "false") throw new Error("the Now playing view button is still on");
      await toggle.click();
      await view.waitFor({ timeout: 3000 });
      // "Open queue" on Next in queue.
      await view.getByRole("button", { name: "Open queue" }).click();
      await panel(p, "Queue").waitFor({ timeout: 3000 });
    } finally {
      await restorePanel(p);
    }
  }],
  ["player-npv-comments", "/", async (p, t) => {
    const { item } = t.fixtures["/v1/me/player"];
    const view = panel(p, "Now playing view");
    // No comments yet: the card says so, and "Add a comment" opens the player's dialog on this song.
    await p.route("**/api/comments/song/**", (r) => r.fulfill({ json: { comments: [] } }));
    await p.reload({ waitUntil: "networkidle" });
    await view.getByText("No one's commented thus far. Be the first!").waitFor({ timeout: 3000 });
    await t.snap(p, "now-playing-view-no-comments");
    await view.getByRole("button", { name: "Add a comment" }).click();
    const dialog = p.getByRole("dialog", { name: "Add Comment" });
    await dialog.getByText(item.name).waitFor({ timeout: 3000 });
    await p.unroute("**/api/comments/song/**");
    // Added, it's in the card at once, newest first and saying who wrote it; the card keeps to three, and Show all leads to
    // the rest.
    await dialog.getByRole("textbox").fill("from the now playing view");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    const newest = view.getByRole("listitem").first();
    await newest.getByText("from the now playing view").waitFor({ timeout: 3000 });
    if (!(await newest.getByText("Victor", { exact: true }).count())) throw new Error("the comment doesn't say who wrote it");
    if ((await view.getByRole("listitem").count()) > 3) throw new Error("more than three comments in the card");
    if ((await view.getByRole("link", { name: "Show all" }).getAttribute("href")) !== `/comments/${item.id}`) throw new Error("Show all doesn't lead to the song's comments");
  }],
  ["player-queue", "/", async (p, t) => {
    const button = p.getByRole("button", { name: "Queue", exact: true });
    try {
      await button.click();
      const queue = panel(p, "Queue");
      await queue.getByRole("heading", { name: "Next up" }).waitFor({ timeout: 3000 });
      if ((await button.getAttribute("aria-pressed")) !== "true") throw new Error("the Queue button isn't on");
      const { currently_playing, queue: next } = t.fixtures["/v1/me/player/queue"];
      const names = await queue.locator(".queue-row-name").allInnerTexts();
      if (names.join() !== [currently_playing, ...next].map((song) => song.name).join()) throw new Error(`the queue lists ${names.join(", ")}`);
      await t.snap(p, "open-queue");
      await button.click();
      await queue.waitFor({ state: "detached", timeout: 3000 });
    } finally {
      await restorePanel(p);
    }
  }],
  ["player-friend-activity", "/", async (p, t) => {
    const { item } = t.fixtures["/v1/me/player"];
    try {
      await p.getByRole("button", { name: "Comment", exact: true }).click();
      const dialog = p.getByRole("dialog", { name: "Add Comment" });
      await dialog.getByRole("textbox").fill("for friend activity");
      await dialog.getByRole("button", { name: "Add", exact: true }).click();
      await p.getByText("Comment Added!").waitFor({ timeout: 3000 });
      // At the top of Friend Activity: who, what, and the song, which leads to its comments.
      await p.getByRole("button", { name: "Friend Activity" }).click();
      const newest = panel(p, "Friend Activity").getByRole("listitem").first();
      await newest.getByText("for friend activity").waitFor({ timeout: 3000 });
      await newest.getByText("Victor", { exact: true }).waitFor({ timeout: 3000 });
      const song = newest.getByRole("link");
      if ((await song.getAttribute("href")) !== `/comments/${item.id}` || !(await song.innerText()).startsWith(item.name)) throw new Error(`song link: ${await song.innerText()}`);
    } finally {
      await restorePanel(p);
    }
  }],
  // The bar's AddCircle saves the song and turns into the green check, and the Now playing view's follows it both ways.
  ["player-save-song", "/", async (p, t) => {
    const { item } = t.fixtures["/v1/me/player"];
    const inView = panel(p, "Now playing view").getByRole("button", { name: "Add to Liked Songs" });
    await inView.waitFor({ timeout: 3000 });
    t.sent.length = 0;
    await p.getByRole("button", { name: "Save to Liked Songs", exact: true }).click();
    const saved = p.getByRole("button", { name: "Remove from Liked Songs", exact: true });
    await saved.waitFor({ timeout: 3000 });
    if (!t.sent.includes(`PUT /v1/me/library?uris=${encodeURIComponent(item.uri)}`)) throw new Error(`sent ${JSON.stringify(t.sent)}`);
    if ((await saved.evaluate((button) => getComputedStyle(button).color)) !== "rgb(30, 215, 96)") throw new Error("the check isn't green");
    if ((await inView.getAttribute("aria-pressed")) !== "true") throw new Error("the Now playing view doesn't show it saved");
    await t.snap(p, "saved-song");
    await inView.click();
    await p.getByRole("button", { name: "Save to Liked Songs", exact: true }).waitFor({ timeout: 3000 });
    if (!t.sent.includes(`DELETE /v1/me/library?uris=${encodeURIComponent(item.uri)}`)) throw new Error(`sent ${JSON.stringify(t.sent)}`);
  }],
  ["player-full-screen", "/", async (p) => {
    await p.getByRole("button", { name: "Full screen", exact: true }).click();
    const exit = p.getByRole("button", { name: "Exit full screen", exact: true });
    await exit.waitFor({ timeout: 3000 });
    await exit.click();
    await p.getByRole("button", { name: "Full screen", exact: true }).waitFor({ timeout: 3000 });
  }],
  // Below 1100px there's no right panel, so no buttons for it; what's left of the bar still fits.
  ["player-narrow", "/", async (p) => {
    for (const width of [1000, 768]) {
      await p.setViewportSize({ width, height: 800 });
      await p.waitForFunction(() => !document.querySelector("button[aria-label='Now playing view'], button[aria-label='Queue']"), null, { timeout: 3000 })
        .catch(() => { throw new Error(`the right panel's buttons are still there at ${width}px`); });
      const out = await p.locator(".player").evaluate((bar) => [...bar.querySelectorAll("button, input")]
        .filter((control) => control.getBoundingClientRect().right > bar.getBoundingClientRect().right + 1).map((control) => control.getAttribute("aria-label")));
      if (out.length) throw new Error(`at ${width}px these stick out of the bar: ${out.join(", ")}`);
    }
  }],

  // smoke.mjs's comments-empty, song-comments and comment-flow, looking in the page.
  ["comments-empty-page", "/comments/QuietTrack000000000000", (p) => p.getByRole("main").getByText("No one's commented thus far").waitFor({ timeout: 5000 })],
  ["song-comments-page", "/playlist/p1", async (p, t) => {
    await p.getByRole("button", { name: /Comments on Listed 0 \(0\)/ }).waitFor({ timeout: 3000 });
    await p.goto(t.base + `/comments/${track.id}`, { waitUntil: "networkidle" });
    const page = p.getByRole("main");
    await page.getByRole("button", { name: "Add a comment" }).click();
    const dialog = p.getByRole("dialog", { name: "Add Comment" });
    await dialog.getByRole("textbox").fill("from the song page");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    // Saved once the dialog goes; until then its box, which has the text too, is in the page.
    await dialog.waitFor({ state: "detached", timeout: 3000 });
    await page.getByText("from the song page").first().waitFor({ timeout: 3000 });
    if (await page.getByText("No one's commented thus far").count()) throw new Error("empty state still shown");
  }],
  ["comment-flow-page", "/", async (p, t) => {
    await p.getByRole("button", { name: "Comment", exact: true }).click();
    const dialog = p.getByRole("dialog", { name: "Add Comment" });
    await dialog.getByRole("textbox").fill("nice drop");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await p.getByText("Comment Added!").waitFor({ timeout: 5000 });
    await p.goto(t.base + "/social", { waitUntil: "networkidle" });
    const page = p.getByRole("main");
    await page.getByText("nice drop").first().waitFor({ timeout: 5000 });
    if (!(await page.getByText("Victor", { exact: true }).count())) throw new Error("comment has no author");
  }],
];
