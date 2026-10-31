// Home, as on Spotify: filter chips, up to 8 shortcuts to what you played last, then one row of cards per shelf.
export const fixtures = {};

// "history" clicked the first card on Home, Liked Songs then; home-history clicks the Liked Songs shortcut instead.
export const replaces = ["history"];

const wide = { width: 1512, height: 982 };
const shelves = ["Recently played", "Your top artists", "Your top songs", "Your playlists", "Your albums"];

// Run in the page: whether every image shown in `root` has loaded.
const loaded = (root) => [...root.querySelectorAll("img")].filter((img) => img.checkVisibility()).every((img) => img.naturalWidth > 0);

// Each shelf's cards: how many there are, how many show, and on how many rows.
const rows = (p) => p.locator(".shelf").evaluateAll((all) => all.map((shelf) => {
  const shown = [...shelf.querySelectorAll(".pcWrapper")].filter((card) => card.checkVisibility());
  return { name: shelf.querySelector("h2").textContent, cards: shelf.querySelectorAll(".pcWrapper").length, shown: shown.length,
    rows: new Set(shown.map((card) => Math.round(card.getBoundingClientRect().top))).size };
}));

export const checks = [
  ["home-shortcuts", "/", async (p, t) => {
    // Liked Songs, the recently played contexts (a song played on its own as its album), then playlists.
    const names = p.locator(".shortcuts .shortcut-name");
    await names.nth(7).waitFor({ timeout: 5000 });
    const wanted = ["Liked Songs", "Mix", "Album Two", "Artist One", "Single Three", "Road Trip", "Late Night", "Someone Else's Mix"];
    if ((await names.allInnerTexts()).join() !== wanted.join()) throw new Error(`shortcuts: ${JSON.stringify(await names.allInnerTexts())}`);
    await p.waitForFunction(loaded, await p.locator(".shortcuts").elementHandle(), { timeout: 3000 }).catch(() => { throw new Error("a shortcut's cover didn't load"); });
    if ((await p.locator(".shortcuts img").count()) !== 8) throw new Error("not every shortcut has a cover");
    // 4 columns on a wide page.
    const lefts = await p.locator(".shortcut").evaluateAll((tiles) => new Set(tiles.map((tile) => tile.getBoundingClientRect().left)).size);
    if (lefts !== 4) throw new Error(`shortcuts in ${lefts} columns`);

    // A tile's play button shows on hover and plays that context.
    const tile = p.locator(".shortcut", { hasText: "Album Two" });
    await tile.hover();
    const play = tile.getByRole("button", { name: "Play Album Two" });
    await p.waitForFunction((button) => getComputedStyle(button).opacity === "1", await play.elementHandle(), { timeout: 3000 });
    t.sent.length = 0;
    const request = p.waitForRequest((r) => r.method() === "PUT" && new URL(r.url()).pathname === "/v1/me/player/play");
    await play.click();
    const body = (await request).postDataJSON();
    if (body?.context_uri !== "spotify:album:al2" || !t.sent.some((c) => c.startsWith("PUT /v1/me/player/play"))) throw new Error(`played ${JSON.stringify(body)}`);

    // Liked Songs plays your liked songs as a list, like its page.
    await p.locator(".shortcut", { hasText: "Liked Songs" }).hover();
    const liked = p.waitForRequest((r) => r.method() === "PUT" && new URL(r.url()).pathname === "/v1/me/player/play");
    await p.getByRole("button", { name: "Play Liked Songs" }).click();
    const uris = t.fixtures["/v1/me/tracks"].items.map(({ track }) => track.uri);
    if (JSON.stringify((await liked).postDataJSON()) !== JSON.stringify({ uris })) throw new Error(`Liked Songs played ${(await liked).postData()}`);
  }],
  ["home-shortcuts-fetch", "/", async (p, t) => {
    // Played from a playlist and an artist that Your Library doesn't have: each is fetched once (the playlist without
    // its tracks) and gets its tile.
    const plays = "/v1/me/player/recently-played", saved = t.fixtures[plays];
    t.fixtures[plays] = { ...saved, items: [{ ...saved.items[0], context: { type: "playlist", uri: "spotify:playlist:p77" } },
      { ...saved.items[2], context: { type: "artist", uri: "spotify:artist:ar9" } }] };
    t.fixtures["/v1/playlists/p77"] = { ...t.fixtures["/v1/playlists/p4"], id: "p77", uri: "spotify:playlist:p77", name: "Someone's Radio" };
    t.fixtures["/v1/artists/ar9"] = { ...t.fixtures["/v1/artists/ar2"], id: "ar9", uri: "spotify:artist:ar9", name: "Artist Nine" };
    const asked = [];
    p.on("request", (r) => /\/v1\/(playlists\/p77|artists\/ar9)/.test(r.url()) && asked.push(r.url()));
    try {
      await p.reload({ waitUntil: "networkidle" });
      const names = p.locator(".shortcuts .shortcut-name");
      await names.filter({ hasText: "Artist Nine" }).waitFor({ timeout: 5000 });
      if ((await names.allInnerTexts()).slice(0, 3).join() !== "Liked Songs,Someone's Radio,Artist Nine") throw new Error(`shortcuts: ${JSON.stringify(await names.allInnerTexts())}`);
      if (asked.length !== 2 || !asked.some((url) => url.includes("/playlists/p77?fields="))) throw new Error(`fetched ${JSON.stringify(asked)}`);
    } finally {
      t.fixtures[plays] = saved;
      delete t.fixtures["/v1/playlists/p77"];
      delete t.fixtures["/v1/artists/ar9"];
    }
  }],
  ["home-shelves", "/", async (p) => {
    try {
      // Covers load as they scroll into view.
      for (const name of shelves) {
        const shelf = p.locator(".shelf").filter({ has: p.locator("h2", { hasText: name }) });
        await shelf.waitFor({ timeout: 5000 });
        await shelf.scrollIntoViewIfNeeded();
        await p.waitForFunction(loaded, await shelf.elementHandle(), { timeout: 3000 }).catch(() => { throw new Error(`covers missing in ${name}`); });
        if (!(await shelf.locator("img").count())) throw new Error(`no covers in ${name}`);
      }
      for (const size of [wide, { width: 1000, height: 800 }]) {
        await p.setViewportSize(size);
        await p.waitForTimeout(200);
        const found = await rows(p);
        if (found.map(({ name }) => name).join() !== shelves.join()) throw new Error(`shelves: ${JSON.stringify(found)}`);
        // One row each, with the cards that don't fit hidden: 8 playlists don't fit at either size.
        const wrapped = found.filter((shelf) => shelf.rows !== 1);
        if (wrapped.length) throw new Error(`at ${size.width}px these wrap: ${JSON.stringify(wrapped)}`);
        const playlists = found.find(({ name }) => name === "Your playlists");
        if (!(playlists.shown > 1 && playlists.shown < playlists.cards)) throw new Error(`at ${size.width}px playlists show ${playlists.shown} of ${playlists.cards}`);
      }
      // Narrow: 2 columns of shortcuts.
      const lefts = await p.locator(".shortcut").evaluateAll((tiles) => new Set(tiles.map((tile) => tile.getBoundingClientRect().left)).size);
      if (lefts !== 2) throw new Error(`shortcuts in ${lefts} columns at 1000px`);
    } finally {
      await p.setViewportSize(wide);
    }
    // Show all leads to the whole list.
    await p.getByRole("link", { name: "Show all Your albums" }).click();
    await p.waitForURL("**/collection/album");
  }],
  ["home-podcasts", "/", async (p) => {
    const chip = (name) => p.locator(".home-filters").getByRole("button", { name, exact: true });
    if ((await chip("All").getAttribute("aria-pressed")) !== "true") throw new Error("All isn't selected at first");
    await chip("Podcasts").click();
    await p.getByText("Podcasts aren't in Shoutify yet.").waitFor({ timeout: 3000 });
    if ((await chip("Podcasts").getAttribute("aria-pressed")) !== "true" || (await chip("All").getAttribute("aria-pressed")) !== "false")
      throw new Error("Podcasts isn't the selected chip");
    if (await p.locator(".shelf, .shortcuts").count()) throw new Error("shelves still shown for Podcasts");
    await chip("Music").click();
    await p.locator(".shelf h2", { hasText: "Your playlists" }).waitFor({ timeout: 3000 });
  }],
  ["home-keyboard", "/", async (p) => {
    // Tab from a card reaches its play button, which rises into view; the same for a shortcut. (Mix is playing, so its
    // buttons show anyway: Album Two's don't.)
    const focused = () => p.evaluate(() => ({ name: document.activeElement?.getAttribute("aria-label"), opacity: getComputedStyle(document.activeElement).opacity }));
    for (const [link, name] of [[p.locator(".shelf .pcWrapper a").nth(1), "Play Album Two"], [p.locator(".shortcut-link").nth(2), "Play Album Two"]]) {
      await link.focus();
      await p.keyboard.press("Tab");
      await p.waitForTimeout(400);
      const now = await focused();
      if (now.name !== name || now.opacity !== "1") throw new Error(`Tab reached ${JSON.stringify(now)}, wanted a shown "${name}"`);
    }
  }],
  ["home-history", "/", async (p) => {
    // What "history" proved: Back and Forward start disabled, then follow a click from Home and back.
    const back = p.getByRole("button", { name: "Go back" }), forward = p.getByRole("button", { name: "Go forward" });
    if (!(await back.isDisabled()) || !(await forward.isDisabled())) throw new Error("history buttons enabled on first page");
    await p.locator(".shortcuts").getByRole("link", { name: "Liked Songs" }).click();
    await p.waitForURL("**/tracks");
    await back.click();
    await p.waitForURL((url) => url.pathname === "/");
    if (await forward.isDisabled()) throw new Error("forward disabled after going back");
    await forward.click();
    await p.waitForURL("**/tracks");
  }],
];
