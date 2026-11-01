// Your Library, the left panel: covers, Liked Songs pinned first with its count, the filter chips, the search box, the
// sort menu, the player's context, the page you're on, Expand, and controls that stay whole in short or narrow windows.
export const fixtures = {};

// The "• • •" keyboard check Tabs on to the first link named "Artist One", meaning the one in the track list; the first
// on the page is now the followed artist in Your Library, so the copy below looks for it in the page.

export const panel = (p) => p.getByRole("complementary", { name: "Your Library" });
export const row = (p, name) => panel(p).getByRole("link", { name, exact: true });
const rowTitles = (p) => p.evaluate(() => [...document.querySelectorAll(".library .library-row-name")].map((el) => el.textContent));
// Lists re-render after loads and clicks: wait (up to 3s) for the rows to read `wanted`, top to bottom.
export const expectRows = (p, wanted, failure) => p.waitForFunction((wanted) =>
  JSON.stringify([...document.querySelectorAll(".library .library-row-name")].map((el) => el.textContent)) === JSON.stringify(wanted), wanted, { timeout: 3000 })
  .catch(async () => { throw new Error(`${failure}: ${JSON.stringify(await rowTitles(p))}`); });
// Whether the locator's element has (or soon gets) keyboard focus.
export const focused = async (locator) =>
  locator.page().waitForFunction((el) => el === document.activeElement, await locator.elementHandle({ timeout: 2000 }), { timeout: 2000 }).then(() => true, () => false);

// Recents: the fake account last played Mix, Album Two, Artist One (and a song on its own), then Road Trip; the rest
// follow in Spotify's order: playlists, then saved albums, then followed artists.
export const recents = ["Liked Songs", "Mix", "Album Two", "Artist One", "Road Trip", "Late Night", "Someone Else's Mix", "Workout", "Chill",
  "Throwbacks", "Focus", "Single Three", "Album One", "Artist Two"];

export const checks = [
  ["library-rows", "/", async (p, t) => {
    await expectRows(p, recents, "rows aren't in Recents order");
    const liked = row(p, "Liked Songs");
    if ((await liked.getAttribute("href")) !== "/tracks") throw new Error("Liked Songs doesn't lead to /tracks");
    if (!(await liked.getByRole("img", { name: "Pinned" }).count())) throw new Error("Liked Songs isn't pinned");
    // Each row says what it is, and whose; Liked Songs how many songs it has.
    for (const [name, wanted] of [["Liked Songs", `Playlist • ${t.fixtures["/v1/me/tracks"].total} songs`], ["Mix", "Playlist • Victor"],
      ["Someone Else's Mix", "Playlist • Bob"], ["Single Three", "Album • Artist One, Artist Two"], ["Artist Two", "Artist"]]) {
      const subtitle = await row(p, name).locator(".library-row-subtitle").innerText();
      if (subtitle !== wanted) throw new Error(`${name} reads "${subtitle}", wanted "${wanted}"`);
    }
    // Every row has its cover (artists round); Workout has no picture, so it gets the note on grey.
    await p.waitForFunction(() => [...document.querySelectorAll(".library img")].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 3000 })
      .catch(() => { throw new Error("a cover didn't load"); });
    if ((await panel(p).locator("img").count()) !== recents.length - 1) throw new Error(`${await panel(p).locator("img").count()} covers for ${recents.length} rows`);
    if (await row(p, "Workout").locator("img").count() || !(await row(p, "Workout").locator("svg").count())) throw new Error("Workout has no placeholder cover");
    if ((await row(p, "Artist Two").locator("img").evaluate((img) => getComputedStyle(img).borderRadius)) !== "50%") throw new Error("artist cover isn't round");
  }],
  ["library-playing", "/", async (p) => {
    // The fake player plays Mix (playlist p1): its title is green and a speaker shows; nothing else.
    await row(p, "Mix").getByRole("img", { name: "Playing" }).waitFor({ timeout: 3000 });
    if ((await panel(p).getByRole("img", { name: "Playing" }).count()) !== 1) throw new Error("more than one row playing");
    const color = (name) => row(p, name).locator(".library-row-name").evaluate((el) => getComputedStyle(el).color);
    if ((await color("Mix")) !== "rgb(30, 215, 96)") throw new Error(`playing title is ${await color("Mix")}`);
    if ((await color("Road Trip")) !== "rgb(255, 255, 255)") throw new Error(`other titles are ${await color("Road Trip")}`);
  }],
  ["library-chips", "/", async (p) => {
    const chip = (name) => panel(p).getByRole("button", { name, exact: true });
    await expectRows(p, recents, "rows didn't load");
    await chip("Artists").click();
    await expectRows(p, ["Artist One", "Artist Two"], "Artists shows more than artists");
    if ((await chip("Artists").getAttribute("aria-pressed")) !== "true") throw new Error("Artists isn't shown as on");
    // One at a time: the others make way for the button that clears it.
    if (await chip("Albums").count()) throw new Error("other chips still shown with Artists on");
    await chip("Clear filters").click();
    await expectRows(p, recents, "Clear filters didn't bring everything back");
    if (!(await focused(chip("Artists")))) throw new Error("focus didn't stay on the chips");
    await chip("Albums").click();
    await expectRows(p, ["Album Two", "Single Three", "Album One"], "Albums shows more than albums");
    await chip("Albums").click();
    await expectRows(p, recents, "pressing Albums again didn't clear it");
    await chip("Playlists").click();
    await expectRows(p, recents.slice(0, 2).concat(["Road Trip", "Late Night", "Someone Else's Mix", "Workout", "Chill", "Throwbacks", "Focus"]),
      "Playlists shows more than playlists");
  }],
  ["library-search", "/", async (p) => {
    const open = panel(p).getByRole("button", { name: "Search in your library" });
    const box = panel(p).getByRole("textbox", { name: "Search in Your Library" });
    await expectRows(p, recents, "rows didn't load");
    await open.click();
    if (!(await focused(box))) throw new Error("the search box didn't take focus");
    // By name, owner or artist, whatever the case.
    for (const [text, wanted] of [["mix", ["Mix", "Someone Else's Mix"]], ["BOB", ["Someone Else's Mix"]],
      ["artist two", ["Album Two", "Single Three", "Artist Two"]], ["liked", ["Liked Songs"]], ["zzz", []]]) {
      await box.fill(text);
      await expectRows(p, wanted, `searching "${text}"`);
    }
    await panel(p).getByText("Nothing in Your Library matches “zzz”.").waitFor({ timeout: 3000 });
    // Escape empties and closes it, and hands focus back.
    await box.press("Escape");
    await expectRows(p, recents, "Escape didn't bring everything back");
    if (await box.count()) throw new Error("Escape didn't close the search box");
    if (!(await focused(open))) throw new Error("Escape didn't give focus back to the magnifier");
    // Leaving it closes it only when it's empty.
    await open.click();
    await box.fill("mix");
    await box.blur();
    if ((await box.inputValue()) !== "mix") throw new Error("leaving the search box lost the search");
    await box.fill("");
    await box.blur();
    await open.waitFor({ timeout: 3000 });
  }],
  ["library-sort", "/", async (p, t) => {
    const menu = p.getByRole("menu", { name: "Sort by" });
    const option = (name) => menu.getByRole("menuitemradio", { name, exact: true });
    await expectRows(p, recents, "rows didn't load");
    const recentsButton = panel(p).getByRole("button", { name: "Recents", exact: true });
    await recentsButton.click();
    if ((await menu.getByRole("menuitemradio", { checked: true }).allInnerTexts()).join() !== "Recents") throw new Error("Recents isn't the checked sort");
    if (!(await focused(option("Recents")))) throw new Error("opening the menu didn't focus the checked sort");
    await p.keyboard.press("ArrowDown");
    if (!(await focused(option("Recently Added")))) throw new Error("ArrowDown didn't move on");
    await t.snap(p, "open-library-sort");
    await p.keyboard.press("Escape");
    if (await menu.count()) throw new Error("Escape didn't close the menu");
    if (!(await focused(recentsButton))) throw new Error("Escape didn't give focus back to the sort button");
    await recentsButton.click();
    await option("Alphabetical").click();
    await expectRows(p, ["Liked Songs", "Album One", "Album Two", "Artist One", "Artist Two", "Chill", "Focus", "Late Night", "Mix", "Road Trip",
      "Single Three", "Someone Else's Mix", "Throwbacks", "Workout"], "Alphabetical didn't sort by name");
    const alphabetical = panel(p).getByRole("button", { name: "Alphabetical", exact: true });
    if (!(await focused(alphabetical))) throw new Error("choosing a sort didn't give focus back to its button");
    // A click elsewhere closes it, keeping the sort.
    await alphabetical.click();
    await menu.waitFor({ timeout: 3000 });
    await p.getByRole("banner").click({ position: { x: 300, y: 32 } });
    if (await menu.count()) throw new Error("a click elsewhere didn't close the menu");
    await p.getByRole("button", { name: "Alphabetical", exact: true }).waitFor({ timeout: 3000 });
  }],
  ["library-current", "/playlist/p4", async (p) => {
    // The page you're on: its row is lighter, and marked as the current page.
    const current = async (name) => {
      await p.waitForFunction((name) => document.querySelector(".library [aria-current=page]")?.querySelector(".library-row-name")?.textContent === name, name, { timeout: 3000 })
        .catch(() => { throw new Error(`${name}'s row isn't the current page`); });
      if ((await panel(p).locator("[aria-current=page]").count()) !== 1) throw new Error("more than one current row");
      const background = await row(p, name).evaluate((el) => getComputedStyle(el).backgroundColor);
      if (background !== "rgb(42, 42, 42)") throw new Error(`current row's background is ${background}`);
    };
    await current("Road Trip");
    await panel(p).getByRole("link", { name: "Expand Your Library" }).click();
    await p.waitForURL("**/collection/playlist");
    await row(p, "Album One").click();
    await p.waitForURL("**/album/al1");
    await current("Album One");
    await row(p, "Liked Songs").click();
    await p.waitForURL("**/tracks");
    await current("Liked Songs");
  }],
  ["library-empty", "/", async (p, t) => {
    // Nothing saved: the panel says so, once it knows; while a list is still loading it says nothing.
    const lists = { "/v1/me/playlists": { items: [], next: null, total: 0 }, "/v1/me/albums": { items: [], next: null, total: 0 },
      "/v1/me/following": { artists: { items: [], next: null, total: 0 } } };
    const saved = Object.fromEntries(Object.keys(lists).map((path) => [path, t.fixtures[path]]));
    let release;
    const held = new Promise((resolve) => (release = resolve));
    await p.route((url) => url.pathname === "/v1/me/playlists", async (r) => { await held; await r.fallback().catch(() => {}); });
    Object.assign(t.fixtures, lists);
    try {
      await p.reload({ waitUntil: "domcontentloaded" });
      await expectRows(p, ["Liked Songs"], "rows shown for an empty library");
      await p.waitForTimeout(500);
      if (await panel(p).locator(".library-note").count()) throw new Error(`said "${await panel(p).locator(".library-note").innerText()}" while the playlists were loading`);
      release();
      await panel(p).getByText("Playlists, albums and artists you save show up here.").waitFor({ timeout: 3000 });
      await panel(p).getByRole("button", { name: "Artists", exact: true }).click();
      await panel(p).getByText("Artists you follow show up here.").waitFor({ timeout: 3000 });
    } finally {
      Object.assign(t.fixtures, saved);
      release();
    }
  }],
  ["library-short", "/", async (p) => {
    // A short window (a laptop with the browser's bars) and the narrowest the app goes: the controls stay whole inside
    // the panel, and the list keeps room for rows and scrolls the rest.
    const controls = [["Create Playlist", "button"], ["Expand Your Library", "link"], ["Playlists", "button"], ["Artists", "button"],
      ["Albums", "button"], ["Search in your library", "button"], ["Recents", "button"]];
    await expectRows(p, recents, "rows didn't load");
    for (const size of [{ width: 1280, height: 560 }, { width: 768, height: 560 }]) {
      await p.setViewportSize(size);
      await p.waitForTimeout(200);
      const box = await panel(p).boundingBox();
      for (const [name, role] of controls) {
        const b = await panel(p).getByRole(role, { name, exact: true }).boundingBox();
        if (!b || b.x < box.x || b.x + b.width > box.x + box.width || b.y < box.y || b.y + b.height > box.y + box.height)
          throw new Error(`${name} cut off at ${size.width}×${size.height}`);
      }
      const list = await panel(p).getByRole("list").evaluate((ul) => ({ shown: ul.clientHeight, needed: ul.scrollHeight }));
      if (list.shown < 2 * 64) throw new Error(`list only ${list.shown}px tall at ${size.width}×${size.height}`);
      if (list.needed <= list.shown) throw new Error(`list doesn't scroll at ${size.width}×${size.height}`);
    }
  }],
];
