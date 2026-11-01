// Credential-free smoke test: real Shoutify server, Spotify Web API answered from fixtures.
// Usage (inside the playwright image): node smoke.mjs http://host:port [screenshotDir]
import { readdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { album, artist, cover, fixtures, me, playlist, searchItems, track, track2, listed, page2 } from "./data.mjs";

const base = process.argv[2];
const shots = process.argv[3];
const browser = await chromium.launch();
let failures = 0;
// Console errors a check provokes on purpose (requests it makes fail, 401 before login, React logging an error a boundary
// caught). Matched against the console text.
const expectedConsole = {
  "login": /401/, "login-error": /401/, "autoconnect": /404/, "album-error": /404/, "comment-save-fails": /502/, "composer-save-fails": /502/,
  "like-comment-fails": /502/, "reply-post": /502/,
  "scroll-error-once": /500/, "scroll-race": /ERR_ABORTED/,
};

// Extra screenshots of popups that a check closes again before its final shot.
const snap = (p, name) => shots && p.screenshot({ path: `${shots}/${name}.png` });

async function check(name, ctx, path, after) {
  if (replaced.has(name)) return;
  const page = await ctx.newPage();
  const problems = [];
  const allowed = (text) => expectedConsole[name]?.test(text);
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !allowed(m.text()) && problems.push(`console: ${m.text()}`));
  // ERR_ABORTED: the app cancelling a request on purpose (it left the page, or a newer request replaced it).
  page.on("requestfailed", (r) => r.failure()?.errorText !== "net::ERR_ABORTED" && problems.push(`requestfailed: ${r.url().slice(0, 90)} ${r.failure()?.errorText}`));
  await page.goto(base + path, { waitUntil: "networkidle" });
  // A failed expectation is reported as a FAIL line instead of aborting the remaining checks.
  if (after) await after(page).catch((e) => problems.push(`check: ${e.message.split("\n")[0]}`));
  await page.waitForTimeout(400);
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 160);
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
  console.log(`${problems.length ? "FAIL" : "ok  "} ${name} ${path} :: ${text}`);
  for (const p of problems) console.log("     " + p);
  failures += problems.length ? 1 : 0;
  await page.close();
}

// Covers can be read back by a canvas (for banner colours), as Spotify's CDN allows.
const coverRoute = (r) => r.fulfill({ body: cover(r.request().url()), contentType: "image/svg+xml", headers: { "access-control-allow-origin": "*" } });

// Each part of the UI keeps its checks in checks/*.mjs: `export const fixtures = {...}` adds Spotify answers by path, and
// `export const checks = [[name, path, async (page, t) => {...}], ...]` runs in the logged-in session below, where `t`
// holds what the checks here use too (the base URL, requests sent, searches made, fixtures, snap).
const areas = await Promise.all(readdirSync(new URL("./checks/", import.meta.url)).filter((f) => f.endsWith(".mjs")).sort()
  .map((f) => import(`./checks/${f}`)));
for (const area of areas) Object.assign(fixtures, area.fixtures);
// An area whose new markup breaks a check above writes its own version and lists the old check's name in
// `export const replaces = [...]`; the old one is skipped. Keep everything the old check proved.
const replaced = new Set(areas.flatMap((area) => area.replaces ?? []));

// Logged out: no token anywhere, the login screen should render.
const anon = await browser.newContext();
await anon.route("https://sdk.scdn.co/**", (r) => r.fulfill({ body: "", contentType: "text/javascript" }));
await check("login", anon, "/", async (page) => {
  if (!(await page.getByText("Log in with Spotify").isVisible())) throw new Error("no login button");
});

await check("login-error", anon, "/#error=state_mismatch", async (page) => {
  if (!(await page.getByRole("alert").isVisible())) throw new Error("no login error shown");
  if (new URL(page.url()).hash) throw new Error("error stayed in the URL");
});

// Logged in, with Spotify mocked, at the size of the reference screenshot of Spotify's web player.
const viewport = { width: 1512, height: 982 };
const ctx = await browser.newContext({ viewport });
const unmocked = new Set();
const searches = [];
const sent = [];
let searchItemsOverride = null;
// Signed in the real way: the server trades this refresh cookie for a token and an author cookie.
const session = [{ name: "refresh_key", value: "good-refresh", url: base }];
await ctx.addCookies(session);
await ctx.route(/^https:\/\/(i|t|misc)\.scdn\.co\//, coverRoute);
await ctx.route("https://sdk.scdn.co/**", (r) => r.fulfill({ body: "", contentType: "text/javascript" }));
await ctx.route("https://api.spotify.com/**", (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === "/v1/search") {
    searches.push(url.searchParams.get("q"));
    const types = url.searchParams.get("type").split(",");
    return r.fulfill({ json: Object.fromEntries(types.map((type) => [`${type}s`, { items: (searchItemsOverride ?? searchItems)[type] ?? [], next: null }])) });
  }
  if (r.request().method() === "POST" && url.pathname === "/v1/me/playlists") return r.fulfill({ status: 201, json: { ...playlist, id: "p3", name: "My Playlist #9", uri: "spotify:playlist:p3" } });
  if (r.request().method() !== "GET") { sent.push(`${r.request().method()} ${url.pathname}${url.search}`); return r.fulfill({ status: 200, body: "" }); }
  if (r.request().method() !== "GET") return r.fulfill({ status: 200, body: "" });
  if (url.pathname === "/v1/albums/missing") return r.fulfill({ status: 404, json: { error: { status: 404, message: "Resource not found" } } });
  if (!(url.pathname in fixtures)) unmocked.add(url.pathname);
  const body = fixtures[url.pathname];
  return body === null ? r.fulfill({ status: 204, body: "" }) : r.fulfill({ json: body ?? {} });
});

for (const [name, path, after] of [
  ["home", "/"],
  ["search", "/search", async (p) => {
    const input = p.locator(".SearchInput");
    await input.pressSequentially("track", { delay: 40 });
    for (const row of ["Songs", "Artists", "Albums", "Playlists"]) await p.locator(".featured").getByRole("heading", { name: row, exact: true }).waitFor({ timeout: 3000 });
    if (searches.length !== 1 || searches[0] !== "track") throw new Error(`expected one debounced search, got ${JSON.stringify(searches)}`);
    if (new URL(p.url()).search !== "?q=track") throw new Error(`query not in the URL: ${p.url()}`);
    // Back from a result returns to the same search.
    await p.locator(".pcWrapper a", { hasText: "Album One" }).first().click();
    await p.waitForURL("**/album/al1");
    await p.getByRole("button", { name: "Go back" }).click();
    await p.locator(".featured").getByRole("heading", { name: "Songs", exact: true }).waitFor({ timeout: 3000 });
    if ((await input.inputValue()) !== "track") throw new Error(`search box lost the query: "${await input.inputValue()}"`);
  }],
  ["search-caret", "/search", async (p) => {
    // Typing into the middle of the query keeps the caret where you type.
    const input = p.locator(".SearchInput");
    await input.pressSequentially("punk", { delay: 20 });
    await input.press("Home");
    await input.pressSequentially("daft ", { delay: 20 });
    if ((await input.inputValue()) !== "daft punk") throw new Error(`typed into the middle, got "${await input.inputValue()}"`);
  }],
  ["library-playlists", "/collection"],
  ["library-artists", "/collection/artist"],
  ["library-albums", "/collection/album"],
  ["social", "/social"],
  ["playlist", "/playlist/p1", async (p) => {
    await p.getByText("Rock & roll, see part two").first().waitFor({ timeout: 5000 });
    await p.locator(".featured").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await p.getByText("Track Two").waitFor({ timeout: 5000 });
    if (await p.getByRole("button", { name: /Your Library$/ }).count()) throw new Error("heart on your own playlist");
  }],
  ["scroll-once", "/playlist/p1", async (p) => {
    const asked = [];
    await p.route("https://api.spotify.com/v1/playlists/p1/items**", async (r) => {
      asked.push(r.request().url());
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await r.fulfill({ json: page2 }).catch(() => {});
    });
    const bottom = () => p.locator(".featured").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await bottom();
    await p.waitForTimeout(200);
    // A toast re-renders the whole app while page 2 is still loading.
    await p.getByRole("button", { name: "More options for Mix" }).click();
    await p.getByRole("menuitem", { name: "Make public" }).click();
    await bottom();
    await p.getByText("Track Two").waitFor({ timeout: 5000 });
    await p.waitForTimeout(300);
    if (asked.length !== 1) throw new Error(`page 2 requested ${asked.length} times`);
    if ((await p.getByText("Track Two").count()) !== 1) throw new Error("page 2 appended twice");
  }],
  ["scroll-race", "/", async (p) => {
    await p.getByRole("button", { name: "Create Playlist" }).click();
    await p.getByRole("heading", { name: "My Playlist #9" }).waitFor({ timeout: 3000 });
    let requested, release;
    const asked = new Promise((resolve) => (requested = resolve));
    const held = new Promise((resolve) => (release = resolve));
    await p.route("https://api.spotify.com/v1/playlists/p1/items**", async (r) => {
      requested();
      await held;
      await r.fulfill({ json: page2 }).catch(() => {});
    });
    // Same /playlist/:id page, so the same component: p1, then back to p3 while p1's page 2 is pending.
    await p.locator(".other-list").getByText("Mix", { exact: true }).click();
    await p.getByText("Listed 29").waitFor({ timeout: 5000 });
    await p.locator(".featured").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await asked;
    await p.getByRole("button", { name: "Go back" }).click();
    await p.getByRole("heading", { name: "My Playlist #9" }).waitFor({ timeout: 3000 });
    release();
    await p.waitForTimeout(500);
    if (await p.getByText("Track Two").count()) throw new Error("the other playlist's page 2 landed in this one");
  }],
  ["scroll-error-once", "/playlist/p1", async (p) => {
    // A failing next page is asked for once, not again on every toast (the toast used to recreate the observer).
    let pages = 0;
    await p.route((url) => url.pathname === "/v1/playlists/p1/items", (r) => { pages++; return r.fulfill({ status: 500, json: { error: { status: 500, message: "boom" } } }); });
    await p.locator(".featured").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await p.getByText("ERROR: boom").waitFor({ timeout: 5000 });
    await p.waitForTimeout(4000);
    if (pages !== 1) throw new Error(`failing next page requested ${pages} times`);
  }],
  ["album", "/album/al1"],
  ["artist", "/artist/ar1"],
  ["liked", "/tracks"],
  ["annotations", "/annotations"],
  ["comments", `/comments/${track.id}`],
  ["profile", "/user/victor"],
  ["profile-other", "/user/bob", (p) => p.getByText("doesn't share other people's profiles").waitFor({ timeout: 5000 })],
  ["playlist-followed", "/playlist/p2", async (p) => {
    await p.getByText("only shows apps the tracks of playlists you own").waitFor({ timeout: 5000 });
    await p.getByRole("button", { name: "Save to Your Library" }).waitFor({ timeout: 3000 });
  }],
  ["now-playing", "/playlist/p1", async (p) => {
    await p.locator(".trackListItem.current").first().waitFor({ timeout: 5000 });
    const current = await p.locator(".trackListItem.current").allInnerTexts();
    if (current.length !== 1 || !current[0].includes("Listed 3")) throw new Error(`current rows: ${JSON.stringify(current)}`);
    if (!(await p.locator(".trackListItem.current .equalizer").count())) throw new Error("no equalizer on the playing row");
    if (!(await p.getByRole("button", { name: "Pause", exact: true }).count())) throw new Error("big button is not Pause");
    await p.goto(base + "/collection/playlist", { waitUntil: "networkidle" });
    if (!(await p.locator(".smallButton.playing").count())) throw new Error("playing playlist card has no pause button");
  }],
  ["playlist-menu", "/playlist/p1", async (p) => {
    await p.getByRole("button", { name: "More options for Mix" }).click();
    for (const item of ["Edit details", "Make public", "Delete", "Copy link to playlist", "Open in Spotify app"])
      await p.getByRole("menuitem", { name: item }).waitFor({ timeout: 3000 });
    await snap(p, "open-playlist-menu");
    await p.getByRole("menuitem", { name: "Edit details" }).click();
    const dialog = p.getByRole("dialog", { name: "Edit details" });
    await dialog.getByLabel("Name").fill("Mix Renamed");
    await snap(p, "open-edit-details");
    await dialog.getByRole("button", { name: "Save" }).click();
    await p.getByRole("heading", { name: "Mix Renamed" }).waitFor({ timeout: 3000 });
    if (await dialog.isVisible()) throw new Error("dialog stayed open");
  }],
  ["artist-menu", "/artist/ar1", async (p) => {
    await p.getByRole("button", { name: "More options for Artist One" }).click();
    await p.getByRole("menuitem", { name: "Follow" }).waitFor({ timeout: 3000 });
    await p.keyboard.press("Escape");
    if (await p.getByRole("menu").count()) throw new Error("menu did not close on Escape");
  }],
  ["create-playlist", "/", async (p) => {
    const created = p.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/v1/me/playlists"));
    await p.getByRole("button", { name: "Create Playlist" }).click();
    // Numbered after the playlists already there, as Spotify's apps do.
    const name = (await created).postDataJSON().name;
    if (name !== `My Playlist #${fixtures["/v1/me/playlists"].items.length + 1}`) throw new Error(`new playlist named "${name}"`);
    await p.waitForURL("**/playlist/p3");
    await p.getByRole("heading", { name: "My Playlist #9" }).waitFor({ timeout: 3000 });
  }],
  ["hearts", "/album/al1", async (p) => {
    await p.getByRole("button", { name: "Save to Your Library" }).click();
    await p.getByText("Added to Your Library").waitFor({ timeout: 3000 });
    await p.getByRole("button", { name: "Save to Liked Songs" }).click();
    await p.getByText("Added to Liked Songs").waitFor({ timeout: 3000 });
    if ((await p.getByRole("button", { name: "Remove from Liked Songs" }).getAttribute("aria-pressed")) !== "true") throw new Error("heart not pressed");
  }],
  ["comments-empty", "/comments/QuietTrack000000000000", (p) => p.getByText("No one's commented thus far").waitFor({ timeout: 5000 })],
  ["devices", "/", async (p) => {
    await p.getByRole("button", { name: "Devices" }).click();
    await p.locator(".connect-devices").waitFor({ timeout: 3000 });
    await p.waitForTimeout(300);
    if (!(await p.locator(".connect-devices").isVisible())) throw new Error("device picker closed itself");
    await snap(p, "open-devices");
    await p.keyboard.press("Escape");
    await p.locator(".connect-devices").waitFor({ state: "detached", timeout: 3000 });
  }],
  ["local-file-playing", "/", async (p) => {
    const saved = fixtures["/v1/me/player"];
    const local = { id: null, uri: "spotify:local:Me:Tape:Home+Movie:180", name: "Home Movie", type: "track", is_local: true, duration_ms: 180000, explicit: false, album: { uri: null, name: "Tape", images: [] }, artists: [{ uri: null, name: "Me" }] };
    fixtures["/v1/me/player"] = { ...saved, item: local, context: null };
    try {
      await p.reload({ waitUntil: "networkidle" });
      await p.locator(".player-info-track", { hasText: "Home Movie" }).waitFor({ timeout: 3000 });
      if (await p.locator(".player-info a").count()) throw new Error("local file got links");
      if (!(await p.title()).startsWith("Home Movie • Me")) throw new Error(`title: ${await p.title()}`);
    } finally {
      fixtures["/v1/me/player"] = saved;
    }
  }],
  ["repeat-cycle", "/", async (p) => {
    sent.length = 0;
    for (const title of ["Enable repeat", "Enable repeat one", "Disable repeat"]) {
      await p.getByRole("button", { name: title }).click();
      await p.waitForTimeout(150);
    }
    const repeats = sent.filter((c) => c.includes("/repeat")).map((c) => c.split("state=")[1]);
    if (repeats.join() !== "context,track,off") throw new Error(`repeat sent ${JSON.stringify(repeats)}`);
  }],
  ["sliders", "/", async (p) => {
    sent.length = 0;
    const volume = p.getByRole("slider", { name: "Volume" });
    await volume.focus();
    await p.keyboard.press("ArrowLeft");
    await p.waitForTimeout(200);
    if (!sent.some((c) => c.includes("/volume?volume_percent="))) throw new Error(`volume key press sent ${JSON.stringify(sent)}`);
    await p.getByRole("button", { name: "Mute" }).click();
    await p.waitForTimeout(200);
    if (!sent.some((c) => c.endsWith("volume_percent=0"))) throw new Error("mute didn't send volume 0");
    if (!(await p.getByRole("slider", { name: "Seek" }).getAttribute("aria-valuetext"))?.includes(" of ")) throw new Error("seek has no value text");
  }],
  ["liked-empty", "/tracks", async (p) => {
    const saved = fixtures["/v1/me/tracks"];
    fixtures["/v1/me/tracks"] = { items: [], next: null };
    try {
      await p.reload({ waitUntil: "networkidle" });
      await p.getByText("Songs you like will appear here").waitFor({ timeout: 3000 });
      await p.getByRole("heading", { name: "Liked Songs" }).waitFor({ timeout: 3000 });
    } finally {
      fixtures["/v1/me/tracks"] = saved;
    }
  }],
  ["album-error", "/album/missing", (p) => p.getByText("Couldn't load this album").waitFor({ timeout: 3000 })],
  ["search-back", "/search", async (p) => {
    await p.locator(".SearchInput").pressSequentially("track", { delay: 30 });
    await p.locator(".featured").getByRole("heading", { name: "Songs", exact: true }).waitFor({ timeout: 3000 });
    if (!p.url().includes("q=track")) throw new Error(`query not in URL: ${p.url()}`);
    await p.locator(".pcWrapper a").first().click();
    await p.waitForURL("**/album/**");
    await p.goBack();
    await p.locator(".featured").getByRole("heading", { name: "Songs", exact: true }).waitFor({ timeout: 3000 });
    if ((await p.locator(".SearchInput").inputValue()) !== "track") throw new Error("search box lost the query");
  }],
  ["search-none", "/search?q=zzzz", async (p) => {
    searchItemsOverride = {};
    try {
      await p.reload({ waitUntil: "networkidle" });
      await p.getByText('No results found for "zzzz"').waitFor({ timeout: 3000 });
    } finally {
      searchItemsOverride = null;
    }
  }],
  ["account-menu", "/", async (p) => {
    const button = p.getByRole("button", { name: "Victor: account menu" });
    await button.click();
    await p.getByRole("menuitem", { name: "Log out" }).waitFor({ timeout: 3000 });
    await snap(p, "open-account-menu");
    await p.keyboard.press("Escape");
    if (await p.getByRole("menu").count()) throw new Error("menu stayed open after Escape");
    await button.click();
    await p.locator(".featured").click({ position: { x: 300, y: 400 } });
    if (await p.getByRole("menu").count()) throw new Error("menu stayed open after an outside click");
  }],
  ["not-found", "/no/such/page", (p) => p.getByRole("heading", { name: "Page not found" }).waitFor({ timeout: 3000 })],
  ["history", "/", async (p) => {
    const back = p.getByRole("button", { name: "Go back" }), forward = p.getByRole("button", { name: "Go forward" });
    if (!(await back.isDisabled()) || !(await forward.isDisabled())) throw new Error("history buttons enabled on first page");
    await p.locator(".pcWrapper a").first().click();
    await p.waitForURL("**/tracks");
    await back.click();
    await p.waitForURL((url) => url.pathname === "/");
    if (await forward.isDisabled()) throw new Error("forward disabled after going back");
    await forward.click();
    await p.waitForURL("**/tracks");
  }],
  ["song-comments", "/playlist/p1", async (p) => {
    await p.getByRole("button", { name: /Comments on Listed 0 \(0\)/ }).waitFor({ timeout: 3000 });
    await p.goto(base + `/comments/${track.id}`, { waitUntil: "networkidle" });
    await p.getByRole("button", { name: "Add a comment" }).click();
    await p.getByRole("dialog", { name: "Add Comment" }).getByRole("textbox").fill("from the song page");
    await p.getByRole("button", { name: "Add", exact: true }).click();
    await p.locator(".spotify-tweet-box", { hasText: "from the song page" }).waitFor({ timeout: 3000 });
    if (await p.getByText("No one's commented thus far").count()) throw new Error("empty state still shown");
  }],
  ["comment-flow", "/", async (p) => {
    await p.locator(".player-right button[title=Comment]").click();
    await p.locator(".add-comment textarea").fill("nice drop");
    await p.locator(".add-comment .pill-button-green").click();
    await p.getByText("Comment Added!").waitFor({ timeout: 5000 });
    await p.goto(base + "/social", { waitUntil: "networkidle" });
    await p.getByText("nice drop").waitFor({ timeout: 5000 });
    if (!(await p.locator(".socialGrid .username", { hasText: "Victor" }).count())) throw new Error("comment has no author");
  }],
  // A failed save keeps the dialog and the text; Add needs real text.
  ["comment-save-fails", "/", async (p) => {
    await p.locator(".player-right button[title=Comment]").click();
    const dialog = p.getByRole("dialog", { name: "Add Comment" });
    const box = dialog.getByLabel("Comment", { exact: true }), add = dialog.getByRole("button", { name: "Add", exact: true });
    if (!(await add.isDisabled())) throw new Error("Add enabled with no text");
    await box.fill("   ");
    if (!(await add.isDisabled())) throw new Error("Add enabled for whitespace");
    if ((await box.getAttribute("maxlength")) !== "2000") throw new Error("comment box has no maxlength");
    await box.fill("keep me");
    await snap(p, "open-add-comment");
    await p.route("**/api/comments/add", (r) => r.fulfill({ status: 502, contentType: "text/plain", body: "Bad Gateway" }));
    await add.click();
    await p.getByText("could not save it").waitFor({ timeout: 3000 });
    if ((await box.inputValue()) !== "keep me") throw new Error("text lost after a failed save");
    await p.unroute("**/api/comments/add");
    await add.click();
    await p.getByText("Comment Added!").waitFor({ timeout: 3000 });
    if (await dialog.count()) throw new Error("dialog stayed open after saving");
  }],
  ["annotation-flow", "/annotations", async (p) => {
    await p.getByRole("heading", { name: /^Annotations/ }).waitFor({ timeout: 3000 });
    if ((await p.getByLabel("Line to annotate").getAttribute("maxlength")) !== "500") throw new Error("line box has no maxlength");
    await p.locator(".lyric-container-body textarea").fill("the second verse");
    await p.getByRole("button", { name: "Annotate" }).click();
    await p.getByRole("dialog", { name: "Add Annotation" }).getByLabel("Annotation", { exact: true }).fill("callback to track one");
    await p.locator(".add-comment .pill-button-green").click();
    await p.getByText("Annotation Added!").waitFor({ timeout: 5000 });
    await p.reload({ waitUntil: "networkidle" });
    await p.getByText("callback to track one").waitFor({ timeout: 5000 });
  }],
]) {
  await check(name, ctx, path, after);
}

const t = { base, fixtures, sent, searches, snap };
for (const [name, path, after] of areas.flatMap((area) => area.checks ?? [])) {
  await check(name, ctx, path, after && ((page) => after(page, t)));
}

// Fresh session: nothing active anywhere, and a fake Web Playback SDK that becomes ready as device "dev-1".
const fresh = await browser.newContext({ viewport });
const commands = [];
await fresh.addCookies(session);
await fresh.route(/^https:\/\/(i|t|misc)\.scdn\.co\//, coverRoute);
await fresh.route("https://sdk.scdn.co/**", (r) => r.fulfill({ contentType: "text/javascript", body: `
  window.Spotify = { Player: class {
    constructor(options) { this.listeners = {}; }
    addListener(event, cb) { this.listeners[event] = cb; return true; }
    connect() { setTimeout(() => this.listeners.ready && this.listeners.ready({ device_id: "dev-1" }), 50); return Promise.resolve(true); }
    disconnect() {}
    activateElement() { return Promise.resolve(); }
  } };
  setTimeout(() => window.onSpotifyWebPlaybackSDKReady(), 0);
` }));
let transferred = false;
await fresh.route("https://api.spotify.com/**", (r) => {
  const url = new URL(r.request().url());
  const method = r.request().method();
  if (method !== "GET") {
    commands.push(`${method} ${url.pathname}${url.search} ${r.request().postData() ?? ""}`);
    if (method === "PUT" && url.pathname === "/v1/me/player") transferred = true;
    // The card's play below must fall back to the in-browser device when Spotify says none is active.
    if (url.pathname === "/v1/me/player/play" && !url.searchParams.has("device_id"))
      return r.fulfill({ status: 404, json: { error: { status: 404, message: "Player command failed: No active device found", reason: "NO_ACTIVE_DEVICE" } } });
    return r.fulfill({ status: 204, body: "" });
  }
  if (url.pathname === "/v1/me/player") return transferred ? r.fulfill({ json: { is_playing: false, progress_ms: 0, repeat_state: "off", shuffle_state: false, item: track, context: null, device: { id: "dev-1", volume_percent: 100 } } }) : r.fulfill({ status: 204, body: "" });
  const body = fixtures[url.pathname];
  return body === null ? r.fulfill({ status: 204, body: "" }) : r.fulfill({ json: body ?? {} });
});
await check("autoconnect", fresh, "/collection/playlist", async (p) => {
  await p.waitForTimeout(800);
  if (!commands.some((c) => c.startsWith("PUT /v1/me/player ") && c.includes('"device_ids":["dev-1"]') && c.includes('"play":false')))
    throw new Error(`no transfer to the SDK device: ${JSON.stringify(commands)}`);
  transferred = false; // pretend the device went inactive again
  await p.locator(".pcWrapper").first().hover();
  await p.locator(".smallButton").first().click();
  await p.waitForTimeout(500);
  if (!commands.some((c) => c.startsWith("PUT /v1/me/player/play?device_id=dev-1")))
    throw new Error(`play did not retry on the SDK device: ${JSON.stringify(commands)}`);
});

if (unmocked.size) console.log("unmocked Spotify paths:", [...unmocked].join(", "));
await browser.close();
process.exit(failures ? 1 : 0);
