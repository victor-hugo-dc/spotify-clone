// Playlist page, Liked Songs and "• • •" menu checks from the pages review.
import { me, playlist, track, track2 } from "../data.mjs";

// How Spotify lists a local file in a playlist: no id, so the app leaves it out.
const local = (n) => ({ item: { id: null, uri: `spotify:local:Me:Tape:Song+${n}:180`, name: `Local Song ${n}`, type: "track", is_local: true, duration_ms: 180000, explicit: false, album: { uri: null, name: "Tape", images: [] }, artists: [{ uri: null, name: "Me" }] } });
// As long as Edit details lets you write (300 characters).
const long = "Songs for the long drive up the coast, from the first coffee stop to the last ferry. Windows down for the sunny stretches, slow ones for the fog around Big Sur, and a few singalongs for when everyone in the back seat wakes up. Add whatever you cannot stop humming, but keep it under four minutes.";

export const fixtures = {
  "/v1/playlists/plocal": { ...playlist, id: "plocal", name: "Tape Mix", uri: "spotify:playlist:plocal", description: "", items: { items: [local(1), local(2), { item: null }], next: "https://api.spotify.com/v1/playlists/plocal/items?offset=3" } },
  "/v1/playlists/plocal/items": { items: [{ item: track2 }], next: null },
  "/v1/playlists/plong": { ...playlist, id: "plong", name: "Road Trip Mix", uri: "spotify:playlist:plong", description: long, items: { items: [], next: null } },
};

// Whether the locator's element has (or soon gets) keyboard focus.
const focused = async (locator) =>
  locator.page().waitForFunction((el) => el === document.activeElement, await locator.elementHandle({ timeout: 2000 }), { timeout: 2000 }).then(() => true, () => false);

export const checks = [
  // Until /me answers (after an error it never does) the app can't tell your playlist from one you follow: no heart, which
  // would delete your own, and no owner or library items until it can.
  ["playlist-owner-unknown", "/playlist/p1", async (p) => {
    let release;
    const held = new Promise((resolve) => (release = resolve));
    await p.route((url) => url.pathname === "/v1/me", async (r) => { await held; await r.fulfill({ json: me }).catch(() => {}); });
    await p.reload({ waitUntil: "domcontentloaded" });
    await p.getByRole("heading", { name: "Mix", exact: true }).waitFor({ timeout: 5000 });
    if (await p.getByRole("button", { name: /Your Library$/ }).count()) throw new Error("heart shown before /me answered");
    await p.getByRole("button", { name: "More options for Mix" }).click();
    await p.getByRole("menuitem", { name: "Copy link to playlist" }).waitFor({ timeout: 3000 });
    const items = await p.getByRole("menuitem").allInnerTexts();
    if (items.join() !== "Copy link to playlist,Open in Spotify app") throw new Error(`menu before /me answered: ${items.join(", ")}`);
    release();
    await p.getByRole("menuitem", { name: "Edit details" }).waitFor({ timeout: 3000 });
  }],
  // Going back to another playlist with Edit details open doesn't open it again there.
  ["edit-details-back", "/playlist/p1", async (p) => {
    await p.getByRole("button", { name: "Create Playlist" }).click();
    await p.getByRole("button", { name: "More options for My Playlist #2" }).click();
    await p.getByRole("menuitem", { name: "Edit details" }).click();
    await p.getByRole("dialog", { name: "Edit details" }).waitFor({ timeout: 3000 });
    await p.goBack();
    await p.getByRole("heading", { name: "Mix", exact: true }).waitFor({ timeout: 5000 });
    await p.waitForTimeout(300);
    if (await p.getByRole("dialog").count()) throw new Error("Edit details opened again on the other playlist");
  }],
  // A failed save is told inside the dialog (toasts sit under its backdrop), keeps focus on Save and keeps what was typed;
  // Save can't send it twice, and a name of only spaces isn't saved.
  ["edit-details-save-fails", "/playlist/p1", async (p) => {
    await p.getByRole("button", { name: "More options for Mix" }).click();
    await p.getByRole("menuitem", { name: "Edit details" }).click();
    const dialog = p.getByRole("dialog", { name: "Edit details" });
    const name = dialog.getByLabel("Name"), description = dialog.getByLabel("Description"), save = dialog.getByRole("button", { name: "Save" });
    // A form submits during the click on Save, if it does at all.
    await p.evaluate(() => document.addEventListener("submit", () => (window.submitted = true), true));
    await name.fill("   ");
    await save.click();
    if (await p.evaluate(() => window.submitted)) throw new Error("a name of only spaces was submitted");
    await name.fill("Kept Name");
    await description.fill("kept description");
    // The connection drops once the check says so, faked as a rejected fetch: an error status would also log a console
    // error, failing the check.
    await p.evaluate(() => {
      const real = window.fetch;
      window.puts = 0;
      window.fetch = (input, init) => init?.method !== "PUT" ? real(input, init) :
        (window.puts++, new Promise((_, reject) => (window.failSave = () => { window.fetch = real; reject(new TypeError("Failed to fetch")); })));
    });
    await save.click();
    await p.waitForFunction(() => window.failSave);
    if (!(await focused(save))) throw new Error("focus left Save while saving");
    await save.click();
    if ((await p.evaluate(() => window.puts)) !== 1) throw new Error("Save sent the details again while saving");
    await p.evaluate(() => window.failSave());
    await dialog.getByRole("alert").filter({ hasText: "Failed to fetch" }).waitFor({ timeout: 3000 });
    if (!(await focused(save))) throw new Error("focus left Save after a failed save");
    if ((await name.inputValue()) !== "Kept Name" || (await description.inputValue()) !== "kept description") throw new Error("typed details lost after a failed save");
    await save.click();
    await p.getByRole("heading", { name: "Kept Name" }).waitFor({ timeout: 3000 });
    if (await dialog.isVisible()) throw new Error("dialog stayed open after saving");
  }],
  // A first page with nothing to list (local files) still leads on to the next one.
  ["playlist-local-files", "/playlist/plocal", (p) => p.getByText("Track Two").waitFor({ timeout: 5000 })],
  // A long description stops after a couple of lines instead of squeezing the playlist's name out of the banner.
  ["banner-long-description", "/playlist/plong", async (p) => {
    await p.setViewportSize({ width: 768, height: 700 });
    const title = p.getByRole("heading", { name: "Road Trip Mix" });
    await title.waitFor({ timeout: 3000 });
    const { shown, needed } = await p.getByText(long.slice(0, 40)).evaluate((el) => ({ shown: el.clientHeight, needed: el.scrollHeight }));
    if (needed <= shown) throw new Error(`long description shown in full (${shown}px)`);
    const cut = await title.evaluate((h) => {
      const box = h.getBoundingClientRect();
      for (let el = h.parentElement; el; el = el.parentElement) {
        if (getComputedStyle(el).overflowY === "visible") continue;
        const clip = el.getBoundingClientRect();
        if (box.top < clip.top - 1 || box.bottom > clip.bottom + 1) return true;
      }
      return false;
    });
    if (cut) throw new Error("the playlist's name is cut off");
  }],
  // From the keyboard: the arrow keys, Home and End move through a "• • •" menu, the focused item shows the focus ring, and
  // Escape or choosing an item puts focus back on the button.
  ["more-menu-keyboard", "/playlist/p1", async (p, t) => {
    const more = p.getByRole("button", { name: "More options for Mix" });
    const item = (name) => p.getByRole("menuitem", { name, exact: true });
    await more.focus();
    await p.keyboard.press("Enter");
    for (const [key, name] of [[null, "Edit details"], ["ArrowDown", "Make public"], ["ArrowUp", "Edit details"], ["ArrowUp", "Open in Spotify app"],
      ["ArrowDown", "Edit details"], ["End", "Open in Spotify app"], ["Home", "Edit details"]]) {
      if (key) await p.keyboard.press(key);
      if (!(await focused(item(name)))) throw new Error(`${key ?? "opening the menu"} didn't focus ${name}`);
    }
    if ((await item("Edit details").evaluate((el) => getComputedStyle(el).outlineStyle)) === "none") throw new Error("focused item has no focus ring");
    await t.snap(p, "open-more-menu-keyboard");
    await p.keyboard.press("Escape");
    if (await p.getByRole("menu").count()) throw new Error("menu did not close on Escape");
    if (!(await focused(more))) throw new Error("Escape didn't put focus back on the button");
    await p.keyboard.press("Enter");
    if (!(await focused(item("Edit details")))) throw new Error("reopening the menu didn't focus its first item");
    await p.keyboard.press("ArrowDown");
    await p.keyboard.press("Enter");
    await p.getByText("Playlist is now public").waitFor({ timeout: 3000 });
    if (!(await focused(more))) throw new Error("choosing an item didn't put focus back on the button");
  }],
  // Liked Songs plays as a list of its tracks with no context. Its big button pauses it while the list Shoutify started
  // from there plays, or Spotify's apps play your collection; a song card playing one of its songs is not Liked Songs.
  ["liked-songs-play-button", "/tracks", async (p, t) => {
    const saved = { player: t.fixtures["/v1/me/player"], liked: t.fixtures["/v1/me/tracks"] };
    t.fixtures["/v1/me/tracks"] = { items: [{ track: track2 }, { track }], next: null };
    // Spotify then plays the first of the tracks it was given, with no context.
    await p.route((url) => url.pathname === "/v1/me/player/play", (r) => {
      const uris = r.request().postDataJSON()?.uris;
      if (uris) t.fixtures["/v1/me/player"] = { ...saved.player, item: uris[0] === track.uri ? track : track2, context: null };
      return r.fallback();
    });
    const command = (path) => p.waitForRequest((r) => r.method() === "PUT" && new URL(r.url()).pathname === `/v1/me/player/${path}`);
    // The page's big button comes before the player's own Play/Pause; with the player playing, any "Play" is the big one.
    const big = (name) => p.getByRole("button", { name, exact: true }).first();
    const bigPause = (why) => big("Play").waitFor({ state: "detached", timeout: 3000 }).catch(() => { throw new Error(why); });
    // Liked Songs' rows and big button show together.
    const listed = () => p.getByRole("button", { name: /^Comments on Track Two / }).waitFor({ timeout: 5000 });
    try {
      await p.reload();
      await listed();
      let sent = command("play");
      await big("Play").click();
      if ((await sent).postDataJSON().uris.join() !== [track2.uri, track.uri].join()) throw new Error("big button didn't start Liked Songs");
      await bigPause("big button isn't Pause while the Liked Songs it started plays");
      sent = command("pause");
      await big("Pause").click();
      await sent;
      // A top track's card starts that liked song alone; Liked Songs' big button then starts the whole list.
      await p.getByRole("link", { name: "Home", exact: true }).click();
      await p.getByRole("button", { name: "Play Track One" }).click();
      await p.getByRole("button", { name: "Pause Track One" }).waitFor({ timeout: 3000 });
      await p.getByRole("link", { name: "Liked Songs", exact: true }).first().click();
      await listed();
      if ((await p.getByRole("button", { name: "Pause", exact: true }).count()) !== 1) throw new Error("big button is Pause for a song card's track");
      sent = command("play");
      await big("Play").click();
      if ((await sent).postDataJSON()?.uris?.length !== 2) throw new Error("big button didn't start Liked Songs over a song card's track");
      // Liked Songs as Spotify's own apps play it.
      t.fixtures["/v1/me/player"] = { ...saved.player, item: track, context: { uri: `spotify:user:${me.id}:collection` } };
      await p.reload();
      await listed();
      await bigPause("big button isn't Pause while Spotify plays your collection");
      sent = command("pause");
      await big("Pause").click();
      await sent;
    } finally {
      t.fixtures["/v1/me/player"] = saved.player;
      t.fixtures["/v1/me/tracks"] = saved.liked;
    }
  }],
];
