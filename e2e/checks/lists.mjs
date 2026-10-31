// The list pages (playlist, Liked Songs, album, artist, profile) and their track table, drawn like Spotify's.
import { listed, playlist, track, track2 } from "../data.mjs";

const longName = "An Extremely Long Playlist Name That Keeps Going Well Past Anything Spotify Would Show On One Line";
export const fixtures = {
  "/v1/playlists/plongname": { ...playlist, id: "plongname", name: longName, uri: "spotify:playlist:plongname", description: "", items: { items: [], next: null, total: 0 } },
};

// The "• • •" keyboard check, with Tab now landing on the view menu, the next control after the "…" button.
export const replaces = ["more-menu-keyboard"];

// Whether the locator's element has (or soon gets) keyboard focus.
const focused = async (locator) =>
  locator.page().waitForFunction((el) => el === document.activeElement, await locator.elementHandle({ timeout: 2000 }), { timeout: 2000 }).then(() => true, () => false);

const until = (p, state, arg, failure) => p.waitForFunction(state, arg, { timeout: 3000 }).catch(() => { throw new Error(failure); });

// What each row shows, in order.
const rows = (p) => p.locator(".trackRows > li").evaluateAll((items) => items.map((row) => ({
  text: row.innerText.replace(/\s+/g, " "),
  cover: row.querySelector("img.trackCover")?.getAttribute("src") ?? null,
  added: row.querySelector(".trackAddedCell")?.textContent ?? null,
  height: Math.round(row.getBoundingClientRect().height),
})));

export const checks = [
  ["lists-banner", "/playlist/p1", async (p, t) => {
    // The banner takes its colour from the cover, and so does the band behind the action bar.
    await until(p, () => getComputedStyle(document.querySelector(".banner")).getPropertyValue("--banner-color").startsWith("hsl("), null,
      "the banner kept the grey it has without a cover colour");
    await p.getByRole("heading", { name: "Mix", exact: true }).waitFor({ timeout: 3000 });
    // Your own picture by your name, and what's in the playlist.
    const owner = p.locator(".banner").getByRole("link", { name: "Victor" });
    if (!(await owner.locator("img").count())) throw new Error("no picture by the owner's name");
    await p.locator(".banner").getByText("31 songs", { exact: true }).waitFor({ timeout: 3000 });
    await t.snap(p, "lists-playlist-top");
  }],
  ["lists-long-title", "/playlist/plongname", async (p) => {
    // A long name gets a smaller title, wrapped and clamped by the browser, never cut short in the text.
    const title = p.locator(".banner").getByRole("heading", { level: 1 });
    await title.waitFor({ timeout: 3000 });
    const { text, size, wide } = await title.evaluate((h) => ({ text: h.textContent, size: parseFloat(getComputedStyle(h).fontSize), wide: h.scrollWidth > h.clientWidth }));
    if (text !== longName) throw new Error(`title reads "${text}"`);
    if (size > 48) throw new Error(`long title at ${size}px`);
    if (wide) throw new Error("long title runs out of its box sideways");
  }],
  ["lists-table", "/playlist/p1", async (p) => {
    const header = p.locator(".trackListHeader");
    for (const name of ["#", "Title", "Album", "Date added"]) await header.getByText(name, { exact: true }).waitFor({ timeout: 3000 });
    await header.getByRole("img", { name: "Duration" }).waitFor({ timeout: 3000 });
    const list = await rows(p);
    if (list.length !== listed.length) throw new Error(`${list.length} rows, wanted ${listed.length}`);
    const bad = list.filter((row) => !row.cover || !/ ago$|\d{4}$/.test(row.added ?? ""));
    if (bad.length) throw new Error(`rows without a cover or date added: ${JSON.stringify(bad.slice(0, 2))}`);
    if (list[0].added !== "14 hours ago") throw new Error(`first row added "${list[0].added}"`);
    // The header stays at the top of the page as the rows scroll under it.
    await p.locator(".featured").evaluate((el) => el.scrollTo(0, 900));
    await until(p, () => {
      const head = document.querySelector(".trackListHeader"), page = document.querySelector(".featured");
      return head.classList.contains("stuck") && Math.abs(head.getBoundingClientRect().top - page.getBoundingClientRect().top) <= 1;
    }, null, "the header row didn't stay at the top");
  }],
  ["lists-comment-count", "/playlist/p1", async (p) => {
    // A song with comments shows how many without hovering; one without shows its button only on hover or focus.
    const song = listed[2];
    const added = await p.evaluate((body) => fetch("/api/comments/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.ok ? 200 : r.status),
      { songID: song.id, songName: song.name, songArtist: "Artist One", songImage: song.album.images[0].url, commentBody: "from the track table", timestamp: 0 });
    if (added !== 200) throw new Error(`adding a comment answered ${added}`);
    await p.reload({ waitUntil: "networkidle" });
    await p.mouse.move(0, 0);
    const commented = p.getByRole("button", { name: /^Comments on Listed 2 \([1-9]\d*\)$/ });
    await commented.waitFor({ timeout: 3000 });
    const opacity = (button) => button.evaluate((el) => getComputedStyle(el).opacity);
    if ((await opacity(commented)) !== "1") throw new Error("a song's comment count is hidden until hover");
    const quiet = p.getByRole("button", { name: "Comments on Listed 0 (0)" });
    if ((await opacity(quiet)) !== "0") throw new Error("a song without comments shows its comment button without hover");
    await p.getByText("Listed 0", { exact: true }).hover();
    await p.waitForFunction((el) => getComputedStyle(el).opacity === "1", await quiet.elementHandle(), { timeout: 2000 })
      .catch(() => { throw new Error("hovering a row doesn't show its comment button"); });
  }],
  ["lists-now-playing", "/playlist/p1", async (p) => {
    const row = p.locator(".trackListItem.current");
    await row.locator(".equalizer").waitFor({ timeout: 5000 });
    const colour = await row.getByText("Listed 3", { exact: true }).evaluate((el) => getComputedStyle(el).color);
    if (colour !== "rgb(30, 215, 96)") throw new Error(`playing title is ${colour}, not green`);
  }],
  ["lists-shuffle", "/playlist/p4", async (p, t) => {
    t.sent.length = 0;
    const shuffle = p.getByRole("button", { name: "Shuffle Road Trip" });
    await shuffle.click();
    await until(p, (button) => button.getAttribute("aria-pressed") === "true", await shuffle.elementHandle(), "Shuffle isn't on after pressing it");
    const commands = t.sent.filter((c) => c.startsWith("PUT /v1/me/player/"));
    if (commands[0] !== "PUT /v1/me/player/shuffle?state=true" || !commands[1]?.startsWith("PUT /v1/me/player/play"))
      throw new Error(`Shuffle sent ${JSON.stringify(commands)}`);
    await shuffle.click();
    await until(p, (button) => button.getAttribute("aria-pressed") === "false", await shuffle.elementHandle(), "Shuffle didn't turn off");
    if (!t.sent.includes("PUT /v1/me/player/shuffle?state=false")) throw new Error("turning Shuffle off sent nothing");
  }],
  ["lists-download", "/playlist/p1", async (p) => {
    await p.getByRole("button", { name: "Download", exact: true }).click();
    await p.getByRole("status").filter({ hasText: "Downloads are only in Spotify's apps" }).waitFor({ timeout: 3000 });
  }],
  ["lists-compact", "/playlist/p1", async (p, t) => {
    try {
      await p.getByRole("button", { name: "View as List" }).click();
      await p.getByRole("menuitemradio", { name: "Compact" }).click();
      await p.locator(".trackListHeader").getByText("Artist", { exact: true }).waitFor({ timeout: 3000 });
      const check = async (when) => {
        const list = await rows(p);
        if (await p.locator(".trackCover").first().isVisible()) throw new Error(`covers shown in Compact ${when}`);
        if (list.some((row) => row.height !== 32)) throw new Error(`Compact rows ${when} are ${list[0].height}px`);
      };
      await check("");
      await t.snap(p, "lists-compact");
      await p.reload({ waitUntil: "networkidle" });
      await p.getByRole("button", { name: "View as Compact" }).waitFor({ timeout: 3000 });
      await check("after a reload");
      await p.getByRole("button", { name: "View as Compact" }).click();
      await p.getByRole("menuitemradio", { name: "List" }).click();
      await p.locator(".trackCover").first().waitFor({ timeout: 3000 });
    } finally {
      await p.evaluate(() => localStorage.removeItem("shoutify:list-view"));
    }
  }],
  ["lists-tab", "/playlist/p1", async (p) => {
    // Tab goes from the view menu straight to the first row's play button, which shows while it has focus.
    await p.getByRole("button", { name: "View as List" }).focus();
    await p.keyboard.press("Tab");
    const play = p.getByRole("button", { name: "Play Listed 0", exact: true });
    if (!(await focused(play))) throw new Error(`Tab went to ${await p.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.outerHTML.slice(0, 80))}`);
    if ((await play.evaluate((el) => getComputedStyle(el).opacity)) !== "1") throw new Error("the focused play button is invisible");
  }],
  ["lists-saved", "/playlist/p1", async (p, t) => {
    // Which songs are saved is asked once per page of rows, not once per row; Listed 1 is saved. (The player asks about
    // the playing song on its own, so only requests naming the first song of each page count.)
    const asked = [];
    p.on("request", (r) => {
      const url = new URL(r.url());
      const uris = url.pathname === "/v1/me/library/contains" ? url.searchParams.get("uris").split(",") : [];
      if (uris.includes(listed[0].uri) || uris.includes(track2.uri)) asked.push(uris.length);
    });
    await p.route((url) => url.pathname === "/v1/me/library/contains", (r) =>
      r.fulfill({ json: new URL(r.request().url()).searchParams.get("uris").split(",").map((uri) => uri === listed[1].uri) }));
    await p.reload({ waitUntil: "networkidle" });
    await p.getByRole("button", { name: "Remove Listed 1 from Liked Songs" }).waitFor({ timeout: 3000 });
    if (asked.join() !== "30") throw new Error(`first page checked in requests of ${JSON.stringify(asked)}`);
    await p.locator(".featured").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await p.getByText("Track Two").waitFor({ timeout: 5000 });
    await p.waitForTimeout(300);
    if (asked.join() !== "30,1") throw new Error(`second page checked in requests of ${JSON.stringify(asked)}`);
    t.sent.length = 0;
    await p.getByRole("button", { name: "Save Listed 0 to Liked Songs" }).click();
    await p.getByRole("button", { name: "Remove Listed 0 from Liked Songs" }).waitFor({ timeout: 3000 });
    if (!t.sent.includes(`PUT /v1/me/library?uris=${encodeURIComponent(listed[0].uri)}`)) throw new Error(`saving sent ${JSON.stringify(t.sent)}`);
    await p.getByRole("status").filter({ hasText: "Added to Liked Songs" }).waitFor({ timeout: 3000 });
  }],
  ["lists-row-menu", "/playlist/p1", async (p, t) => {
    await p.getByRole("button", { name: "More options for Listed 0" }).click();
    const items = await p.getByRole("menu", { name: "Listed 0" }).getByRole("menuitem").allInnerTexts();
    if (items.join() !== "Go to album,Go to artist,Comments,Copy link to song,Open in Spotify app") throw new Error(`row menu: ${items.join(", ")}`);
    await t.snap(p, "open-row-menu");
    await p.getByRole("menuitem", { name: "Go to album" }).click();
    await p.waitForURL("**/album/al1");
    await p.getByRole("heading", { name: "Album One" }).waitFor({ timeout: 3000 });
  }],
  ["lists-liked", "/tracks", async (p, t) => {
    const saved = t.fixtures["/v1/me/player"];
    // Liked, and never playing here: the player's own question about the playing song doesn't count.
    let checks = 0;
    p.on("request", (r) => new URL(r.url()).pathname === "/v1/me/library/contains" && new URL(r.url()).searchParams.get("uris").includes(listed[5].uri) && checks++);
    // Spotify then plays the first of the tracks it was given, with no context.
    await p.route((url) => url.pathname === "/v1/me/player/play", (r) => {
      const uris = r.request().postDataJSON()?.uris;
      if (uris) t.fixtures["/v1/me/player"] = { ...saved, item: track, context: null };
      return r.fallback();
    });
    try {
      await p.reload({ waitUntil: "networkidle" });
      const colour = await p.locator(".banner").evaluate((el) => getComputedStyle(el).getPropertyValue("--banner-color"));
      if (colour !== "rgb(80, 56, 160)") throw new Error(`Liked Songs banner is ${colour}`);
      // Every row has its cover and date added, and is saved, without asking Spotify.
      const list = await rows(p);
      if (list.some((row) => !row.cover || !row.added)) throw new Error(`rows: ${JSON.stringify(list)}`);
      await p.getByRole("button", { name: "Remove Track One from Liked Songs" }).waitFor({ timeout: 3000 });
      if (checks) throw new Error("asked Spotify whether Liked Songs' songs are saved");
      // The big button shows Pause while the list it started plays, and pauses it.
      const big = p.locator(".playListFunctions .playButton");
      await big.click();
      await until(p, (button) => button.getAttribute("aria-label") === "Pause", await big.elementHandle(), "big button isn't Pause while a liked song from the list plays");
      const paused = p.waitForRequest((r) => r.method() === "PUT" && new URL(r.url()).pathname === "/v1/me/player/pause");
      await big.click();
      await paused;
    } finally {
      t.fixtures["/v1/me/player"] = saved;
    }
  }],
  ["lists-album", "/album/al2", async (p, t) => {
    // Albums: # Title Duration, no covers; artist, year, and how many songs and how long.
    await p.locator(".banner").getByText("3 songs, 11 min 36 sec", { exact: true }).waitFor({ timeout: 3000 });
    await p.locator(".banner").getByText("2023", { exact: true }).waitFor({ timeout: 3000 });
    if (await p.locator(".trackListHeader").getByText("Album", { exact: true }).count()) throw new Error("album page has an Album column");
    if (await p.locator(".trackRows .trackCover").count()) throw new Error("album rows have covers");
    await t.snap(p, "lists-album");
  }],
  ["lists-artist", "/artist/ar1", async (p, t) => {
    // The artist's picture across the banner; each release plays from its card.
    if (!(await p.locator(".banner img").first().getAttribute("src"))) throw new Error("no artist picture in the banner");
    t.sent.length = 0;
    await p.getByRole("button", { name: "Play Album One" }).first().click();
    await p.waitForTimeout(300);
    if (!t.sent.some((c) => c.startsWith("PUT /v1/me/player/play"))) throw new Error(`playing a release sent ${JSON.stringify(t.sent)}`);
    await t.snap(p, "lists-artist");
  }],
  ["lists-narrow", "/playlist/p1", async (p, t) => {
    // A narrow page drops Date added, then Album.
    try {
      await p.setViewportSize({ width: 1000, height: 800 });
      await p.locator(".trackListHeader").getByText("Date added", { exact: true }).waitFor({ timeout: 3000 });
      await p.setViewportSize({ width: 768, height: 800 });
      await until(p, () => !document.querySelector(".trackListHeader .trackAlbumCell").checkVisibility(), null, "Album column still there at 768px");
      if (await p.locator(".trackListHeader").getByText("Date added", { exact: true }).isVisible()) throw new Error("Date added still there at 768px");
      await t.snap(p, "lists-narrow");
    } finally {
      await p.setViewportSize({ width: 1512, height: 982 });
    }
  }],
  // From the keyboard: the arrow keys, Home and End move through a "…" menu, the focused item shows the focus ring,
  // Escape or choosing an item puts focus back on the button, and Tab closes the menu, moving on from the button.
  ["lists-more-menu-keyboard", "/playlist/p1", async (p, t) => {
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
    for (const [key, next] of [["Shift+Tab", more], ["Tab", p.getByRole("button", { name: "View as List" })]]) {
      await more.focus();
      await p.keyboard.press("Enter");
      if (!(await focused(item("Edit details")))) throw new Error("reopening the menu didn't focus its first item");
      await p.keyboard.press(key);
      if (await p.getByRole("menu").count()) throw new Error(`menu stayed open on ${key}`);
      if (!(await focused(next))) throw new Error(`${key} didn't move on from the button`);
    }
  }],
];
