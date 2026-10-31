// Search (Browse all, the results and their chips) and Your Library's page. Results are found by role and name, not
// by the cards' classes, which are another area's.
import { album, album2, album2Songs, album3, artist, artist2, listed, playlist, playlists, single, track } from "../data.mjs";

export const fixtures = {};
// smoke.mjs's versions clicked the first card by its class: on the search page that's an artist now (Top result and
// Songs come first), and on /collection/playlist it's Liked Songs, whose button opens its page instead of playing.
export const replaces = ["search", "search-back", "autoconnect"];

// What the fake Spotify finds for any query: more than fits, and the null Spotify pads results with.
const found = {
  track: [track, ...album2Songs, single, listed[0]],
  artist: [artist, artist2],
  album: [album, album2, album3],
  playlist: [playlist, null, playlists[1]],
};
// Answers /v1/search for this page, noting each query and its limit.
async function fakeSearch(p) {
  const asked = [];
  await p.route((url) => url.pathname === "/v1/search", (r) => {
    const url = new URL(r.request().url());
    asked.push(`${url.searchParams.get("q")} limit=${url.searchParams.get("limit")}`);
    r.fulfill({ json: Object.fromEntries(url.searchParams.get("type").split(",").map((type) => [`${type}s`, { items: found[type] ?? [], next: null }])) });
  });
  return asked;
}

const main = (p) => p.getByRole("main");
const heading = (p, name) => main(p).getByRole("heading", { name, exact: true });
const box = (p) => p.getByRole("textbox", { name: "What do you want to play?" });

// Presses Tab from the page's top until the button named `name` has focus.
async function tabTo(p, name) {
  await main(p).focus();
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press("Tab");
    if (await p.evaluate((name) => document.activeElement?.getAttribute("aria-label") === name, name)) return;
  }
  throw new Error(`Tab never reached "${name}"`);
}

export const checks = [
  // Before anything is typed: Browse all, a tile per genre, each a search.
  ["search-browse", "/search", async (p, t) => {
    const asked = await fakeSearch(p);
    await heading(p, "Browse all").waitFor({ timeout: 3000 });
    await t.snap(p, "search-browse-all");
    const tiles = await main(p).getByRole("listitem").allInnerTexts();
    for (const genre of ["Pop", "Hip-Hop", "Rock", "Latin", "Dance/Electronic", "Indie", "R&B", "Jazz"])
      if (!tiles.includes(genre)) throw new Error(`no ${genre} tile: ${JSON.stringify(tiles)}`);
    await main(p).getByRole("link", { name: "R&B", exact: true }).click();
    await p.waitForURL((url) => url.pathname === "/search" && url.searchParams.get("q") === "R&B");
    await heading(p, "Top result").waitFor({ timeout: 3000 });
    if (asked.join() !== "R&B limit=10") throw new Error(`searched ${JSON.stringify(asked)}`);
    if ((await box(p).inputValue()) !== "R&B") throw new Error(`search box shows "${await box(p).inputValue()}"`);
  }],
  // Typing sends one search once it pauses, with the query in the URL. Top result (the song: no artist is called
  // "track") beside four songs with covers, then a shelf each of artists, albums and playlists. Back from a result,
  // by the app's button or the browser's, returns to the same results with the query still in the box.
  ["search-results", "/search", async (p) => {
    const asked = await fakeSearch(p);
    await box(p).pressSequentially("track", { delay: 40 });
    for (const name of ["Top result", "Songs", "Artists", "Albums", "Playlists"]) await heading(p, name).waitFor({ timeout: 3000 });
    await p.waitForTimeout(400);
    if (asked.join() !== "track limit=10") throw new Error(`expected one debounced search, got ${JSON.stringify(asked)}`);
    if (new URL(p.url()).search !== "?q=track") throw new Error(`query not in the URL: ${p.url()}`);
    const top = main(p).getByRole("region", { name: "Top result" });
    if (!(await top.getByRole("link", { name: /^Track One/ }).count()) || !(await top.getByText("Song", { exact: true }).count()))
      throw new Error(`top result: ${await top.innerText()}`);
    const songs = main(p).getByRole("region", { name: "Songs" }).getByRole("listitem");
    if ((await songs.count()) !== 4) throw new Error(`${await songs.count()} songs, wanted 4`);
    for (const row of await songs.all()) if (!(await row.locator("img").count())) throw new Error(`no cover: ${await row.innerText()}`);
    if (!(await songs.nth(2).getByText("E", { exact: true }).count())) throw new Error("explicit song has no E badge");
    for (const [shelf, names] of [["Artists", [artist.name, artist2.name]], ["Albums", [album.name, album2.name, album3.name]], ["Playlists", [playlist.name, playlists[1].name]]])
      for (const name of names) await main(p).getByRole("region", { name: shelf }).getByRole("link", { name: new RegExp(name) }).waitFor({ timeout: 3000 });
    await main(p).getByRole("link", { name: new RegExp(album.name) }).click();
    await p.waitForURL("**/album/al1");
    await p.getByRole("button", { name: "Go back" }).click();
    await heading(p, "Songs").waitFor({ timeout: 3000 });
    if ((await box(p).inputValue()) !== "track") throw new Error(`search box lost the query: "${await box(p).inputValue()}"`);
    await main(p).getByRole("region", { name: "Artists" }).getByRole("link", { name: new RegExp(artist2.name) }).click();
    await p.waitForURL("**/artist/ar2");
    await p.goBack();
    await heading(p, "Songs").waitFor({ timeout: 3000 });
    if ((await box(p).inputValue()) !== "track") throw new Error("search box lost the query after the browser's Back");
  }],
  // The Songs chip shows every song, and only songs; the choice survives a visit to a result.
  ["search-songs-chip", "/search?q=track", async (p) => {
    await fakeSearch(p);
    await p.reload({ waitUntil: "networkidle" });
    await main(p).getByRole("button", { name: "Songs", exact: true }).click();
    await p.waitForURL((url) => url.searchParams.get("type") === "track");
    await main(p).getByRole("button", { name: "Songs", exact: true, pressed: true }).waitFor({ timeout: 3000 });
    for (const name of ["Top result", "Artists", "Albums", "Playlists"])
      if (await main(p).getByRole("region", { name }).count()) throw new Error(`${name} still shown`);
    const rows = main(p).getByRole("listitem");
    if ((await rows.count()) !== found.track.length) throw new Error(`${await rows.count()} songs, wanted ${found.track.length}`);
    await rows.first().getByRole("link", { name: album.name, exact: true }).click();
    await p.waitForURL("**/album/al1");
    await p.goBack();
    await main(p).getByRole("button", { name: "Songs", exact: true, pressed: true }).waitFor({ timeout: 3000 });
  }],
  // A song's play button, reached with Tab, plays that song.
  ["search-play-song", "/search?q=track", async (p) => {
    await fakeSearch(p);
    await p.reload({ waitUntil: "networkidle" });
    const song = album2Songs[1], name = `Play ${song.name} by ${song.artists[0].name}`;
    await main(p).getByRole("button", { name }).waitFor({ timeout: 3000 });
    await tabTo(p, name);
    const play = p.waitForRequest((r) => r.method() === "PUT" && new URL(r.url()).pathname === "/v1/me/player/play", { timeout: 3000 });
    await p.keyboard.press("Enter");
    const body = (await play).postDataJSON();
    if (JSON.stringify(body?.uris) !== JSON.stringify([song.uri])) throw new Error(`played ${JSON.stringify(body)}`);
  }],
  // Your Library's page: chips for its three lists (the one on show marked current), and a card per item.
  ["library-page", "/collection/artist", async (p, t) => {
    await heading(p, "Your Library").waitFor({ timeout: 3000 });
    const chip = (name) => main(p).getByRole("navigation").getByRole("link", { name, exact: true });
    if ((await chip("Artists").getAttribute("aria-current")) !== "page") throw new Error("Artists chip not current");
    for (const { name } of t.fixtures["/v1/me/following"].artists.items) await main(p).getByRole("link", { name: new RegExp(name) }).waitFor({ timeout: 3000 });
    await chip("Playlists").click();
    await p.waitForURL("**/collection/playlist");
    // Liked Songs first, with its count, then every playlist.
    await main(p).getByRole("link", { name: /^Mix/ }).waitFor({ timeout: 3000 });
    if ((await chip("Playlists").getAttribute("aria-current")) !== "page" || (await chip("Artists").getAttribute("aria-current")) !== null)
      throw new Error("the Playlists chip isn't the current one");
    const cards = (await main(p).getByRole("link").allInnerTexts()).slice(3).map((text) => text.replace(/\s+/g, " "));
    if (!cards[0]?.startsWith("Liked Songs") || !cards[0].includes("4 songs")) throw new Error(`first card: ${cards[0]}`);
    for (const { name } of t.fixtures["/v1/me/playlists"].items)
      if (!cards.some((text) => text.startsWith(name))) throw new Error(`no card for ${name}: ${JSON.stringify(cards)}`);
  }],
  // smoke.mjs's autoconnect, on a page of its own (its 404 is on purpose): with nothing playing anywhere, the in-browser
  // player takes over, and a card's play falls back to it when Spotify says no device is active.
  ["library-autoconnect", "/collection/playlist", async (p, t) => {
    const page = await p.context().newPage();
    const commands = [], errors = [];
    let transferred = false;
    page.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://sdk.scdn.co/**", (r) => r.fulfill({ contentType: "text/javascript", body: `
      window.Spotify = { Player: class {
        constructor(options) { this.listeners = {}; }
        addListener(event, cb) { this.listeners[event] = cb; return true; }
        connect() { setTimeout(() => this.listeners.ready && this.listeners.ready({ device_id: "dev-1" }), 50); return Promise.resolve(true); }
        disconnect() {}
        activateElement() { return Promise.resolve(); }
      } };
      setTimeout(() => window.onSpotifyWebPlaybackSDKReady(), 0);
    ` }));
    await page.route("https://api.spotify.com/**", (r) => {
      const url = new URL(r.request().url()), method = r.request().method();
      if (method !== "GET") {
        commands.push(`${method} ${url.pathname}${url.search} ${r.request().postData() ?? ""}`);
        if (method === "PUT" && url.pathname === "/v1/me/player") transferred = true;
        if (url.pathname === "/v1/me/player/play" && !url.searchParams.has("device_id"))
          return r.fulfill({ status: 404, json: { error: { status: 404, message: "Player command failed: No active device found", reason: "NO_ACTIVE_DEVICE" } } });
        return r.fulfill({ status: 204, body: "" });
      }
      if (url.pathname === "/v1/me/player")
        return transferred ? r.fulfill({ json: { is_playing: false, progress_ms: 0, repeat_state: "off", shuffle_state: false, item: track, context: null, device: { id: "dev-1", volume_percent: 100 } } }) : r.fulfill({ status: 204, body: "" });
      return r.fallback();
    });
    try {
      await page.goto(t.base + "/collection/playlist", { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      if (!commands.some((c) => c.startsWith("PUT /v1/me/player ") && c.includes('"device_ids":["dev-1"]') && c.includes('"play":false')))
        throw new Error(`no transfer to the SDK device: ${JSON.stringify(commands)}`);
      transferred = false; // pretend the device went inactive again
      const play = page.getByRole("main").getByRole("button", { name: `Play ${playlist.name}`, exact: true });
      await play.hover();
      await play.click();
      await page.waitForTimeout(500);
      if (!commands.some((c) => c.startsWith("PUT /v1/me/player/play?device_id=dev-1")))
        throw new Error(`play did not retry on the SDK device: ${JSON.stringify(commands)}`);
      if (errors.length) throw new Error(errors.join("; "));
    } finally {
      await page.close();
    }
  }],
];
