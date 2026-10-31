// The frame every page shares: the top bar, Your Library at the left, the page in the middle, the right panel and the
// player below them, laid out like Spotify's web player.
export const fixtures = {};

// Where the frame's parts are, in whole CSS pixels.
const boxes = (p) => p.evaluate(() => Object.fromEntries(
  ["top-bar", "top-bar-center", "library", "featured", "right-sidebar", "footer"].map((name) => {
    const r = document.querySelector(`.${name}`)?.getBoundingClientRect();
    return [name, r && { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) }];
  })));

// 64px top bar with home and search centred on the window; panels 8px apart, as wide as Spotify's; the player under them.
async function expectFrame(p, rightPanel) {
  const width = p.viewportSize().width, panel = Math.round(Math.min(Math.max(280, 0.23 * width), 420));
  const b = await boxes(p);
  const wrong = [];
  const expect = (what, actual, wanted) => Math.abs(actual - wanted) > 1 && wrong.push(`${what} ${actual}, wanted ${wanted}`);
  expect("top bar bottom", b["top-bar"].bottom, 64);
  expect("home and search centre", (b["top-bar-center"].left + b["top-bar-center"].right) / 2, width / 2);
  expect("library left", b.library.left, 8);
  expect("library top", b.library.top, 64);
  expect("library width", b.library.right - b.library.left, panel);
  expect("page left", b.featured.left, b.library.right + 8);
  expect("page right", b.featured.right, rightPanel ? width - 8 - panel - 8 : width - 8);
  if (rightPanel) expect("right panel right", b["right-sidebar"].right, width - 8);
  expect("player top", b.footer.top, b.library.bottom);
  if (wrong.length) throw new Error(`frame: ${wrong.join("; ")}`);
}

// Navigations re-render a moment after the URL changes, so wait (up to 3s) for what should follow.
const until = (p, state, failure) => p.waitForFunction(state, null, { timeout: 3000 }).catch(() => { throw new Error(failure); });

export const checks = [
  ["frame-top-bar", "/", async (p) => {
    const home = p.getByRole("link", { name: "Home", exact: true });
    if ((await home.getAttribute("aria-current")) !== "page") throw new Error("home button isn't current on /");
    const install = p.getByRole("link", { name: "Install App" });
    if ((await install.getAttribute("href")) !== "https://www.spotify.com/download" || (await install.getAttribute("target")) !== "_blank")
      throw new Error("Install App doesn't open Spotify's download page in a new tab");
    await p.getByRole("link", { name: "Browse" }).click();
    await p.waitForURL((url) => url.pathname === "/search" && url.search === "");
    await until(p, () => !document.querySelector(".top-bar-home").hasAttribute("aria-current"), "home button still current on /search");
    await p.getByRole("link", { name: "What's New" }).click();
    await p.waitForURL("**/social");
    // Typing on any page searches (fast typing too: one history entry); Back returns to that page, with the box emptied.
    const search = p.getByPlaceholder("What do you want to play?");
    await search.pressSequentially("track");
    await p.waitForURL((url) => url.pathname === "/search" && url.searchParams.get("q") === "track");
    await p.getByRole("button", { name: "Go back" }).click();
    await p.waitForURL("**/social");
    await until(p, () => document.querySelector(".SearchInput").value === "", "search box kept its text after leaving the search");
    // The browser's own Back leaves focus in the box (and comes here before the search page renders); it empties all the
    // same, and Forward fills it again.
    await search.pressSequentially("track");
    await p.waitForURL((url) => url.pathname === "/search" && url.searchParams.get("q") === "track");
    await p.goBack();
    await p.waitForURL("**/social");
    await until(p, () => document.querySelector(".SearchInput").value === "", "search box kept its text after the browser's Back");
    if (!(await search.evaluate((input) => input === document.activeElement))) throw new Error("focus left the box, so Back wasn't tested with it there");
    await p.goForward();
    await p.waitForURL((url) => url.pathname === "/search" && url.searchParams.get("q") === "track");
    await until(p, () => document.querySelector(".SearchInput").value === "track", "search box didn't follow the browser's Forward");
    await p.getByRole("button", { name: "Victor: account menu" }).click();
    await p.getByRole("menuitem", { name: "Log out" }).waitFor({ timeout: 3000 });
    await p.keyboard.press("Escape");
  }],
  ["frame-right-panel", "/", async (p) => {
    const friends = p.getByRole("button", { name: "Friend Activity" });
    const close = p.locator(".right-sidebar").getByRole("button", { name: "Close" });
    const focused = (selector) => p.evaluate((selector) => document.activeElement?.matches(selector) ?? false, selector);
    try {
      // A track is playing, so the Now playing view is open by default.
      await p.getByRole("complementary", { name: "Now playing view" }).waitFor({ timeout: 3000 });
      await expectFrame(p, true);
      await friends.click();
      await p.getByRole("complementary", { name: "Friend Activity" }).waitFor({ timeout: 3000 });
      if ((await friends.getAttribute("aria-pressed")) !== "true") throw new Error("Friend Activity not shown as on");
      await friends.click();
      await p.locator(".right-sidebar").waitFor({ state: "detached", timeout: 3000 });
      await expectFrame(p, false);
      // Closing it from the keyboard hands focus back to the button that opened it...
      await friends.press("Enter");
      await close.press("Enter");
      await p.locator(".right-sidebar").waitFor({ state: "detached", timeout: 3000 });
      if (!(await focused("button[aria-label='Friend Activity']"))) throw new Error("Close didn't give focus back to Friend Activity");
      // ...or to the page when nothing did (the Now playing view, open from the start).
      await p.evaluate(() => localStorage.removeItem("shoutify:right-panel"));
      await p.reload({ waitUntil: "networkidle" });
      await close.press("Enter");
      await p.locator(".right-sidebar").waitFor({ state: "detached", timeout: 3000 });
      if (!(await focused("main"))) throw new Error("Close didn't give focus to the page");
      // Each viewer's choice is remembered.
      await p.reload({ waitUntil: "networkidle" });
      if (await p.locator(".right-sidebar").count()) throw new Error("closed right panel came back after a reload");
    } finally {
      await p.evaluate(() => localStorage.removeItem("shoutify:right-panel"));
    }
  }],
  ["frame-narrow", "/", async (p) => {
    // Below 1100px the right panel gives its room to the page, and the top bar still fits. The panel and the button that
    // opens it are gone, not just hidden (a toggle for a hidden panel would be a dead click), and come back when the
    // window widens.
    // Run in the page, so they can't share a variable.
    const gone = () => !document.querySelector(".right-sidebar") && !document.querySelector("button[aria-label='Friend Activity']");
    const back = () => !!document.querySelector(".right-sidebar") && !!document.querySelector("button[aria-label='Friend Activity']");
    await p.getByRole("complementary", { name: "Now playing view" }).waitFor({ timeout: 3000 });
    await p.setViewportSize({ width: 1000, height: 800 });
    await until(p, gone, "right panel or Friend Activity still there at 1000px");
    await p.setViewportSize({ width: 1512, height: 982 });
    await until(p, back, "right panel or Friend Activity didn't come back at 1512px");
    await p.setViewportSize({ width: 1000, height: 800 });
    await until(p, gone, "right panel or Friend Activity still there at 1000px");
    if (!(await p.getByRole("button", { name: "Go forward" }).isVisible())) throw new Error("forward button hidden at 1000px");
    const b = await boxes(p);
    if (Math.abs(b.featured.right - 992) > 1) throw new Error(`page ends at ${b.featured.right}, wanted 992`);
    const overflow = await p.locator(".top-bar").evaluate((bar) => bar.scrollWidth - bar.clientWidth);
    if (overflow > 0) throw new Error(`top bar overflows by ${overflow}px`);
  }],
  ["frame-library", "/", async (p, t) => {
    const library = p.getByRole("complementary", { name: "Your Library" });
    for (const name of ["Liked Songs", ...t.fixtures["/v1/me/playlists"].items.map((playlist) => playlist.name)])
      await library.getByText(name, { exact: true }).waitFor({ timeout: 3000 });
  }],
  ["frame-library-refresh", "/album/al1", async (p) => {
    // Saving something reloads only its own list of Your Library, a moment later; a song, only the Liked Songs count.
    const asked = [];
    p.on("request", (r) => {
      const url = new URL(r.url());
      if (r.method() === "GET" && /^\/v1\/me\/(playlists|albums|following|player\/recently-played|tracks)$/.test(url.pathname)) asked.push(url.pathname + url.search);
    });
    await p.getByRole("button", { name: "Save to Your Library" }).click();
    await p.waitForTimeout(1500);
    if (asked.join() !== "/v1/me/albums?limit=50") throw new Error(`saving an album reloaded ${JSON.stringify(asked)}`);
    asked.length = 0;
    await p.getByRole("button", { name: "Save to Liked Songs" }).click();
    await p.waitForTimeout(1500);
    if (asked.join() !== "/v1/me/tracks?limit=1") throw new Error(`liking a song reloaded ${JSON.stringify(asked)}`);
  }],
  ["frame-library-retry", "/", async (p, t) => {
    // A list that fails is asked for again, and one that can't load says so. On a page of its own: the failures log
    // console errors on purpose, and only those are let through.
    const page = await p.context().newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && !/status of (500|403)/.test(m.text()) && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    const tries = { playlists: 0, artists: 0 };
    await page.route((url) => url.pathname === "/v1/me/playlists", (r) =>
      ++tries.playlists === 1 ? r.fulfill({ status: 500, json: { error: { status: 500, message: "Server error" } } }) : r.fallback());
    await page.route((url) => url.pathname === "/v1/me/following", (r) => {
      tries.artists++;
      return r.fulfill({ status: 403, json: { error: { status: 403, message: "Insufficient client scope" } } });
    });
    try {
      await page.goto(t.base + "/");
      await page.getByText("Couldn't load your artists: Insufficient client scope").waitFor({ timeout: 5000 })
        .catch(() => { throw new Error("no toast for the artists that couldn't load"); });
      await page.waitForTimeout(600); // the toast fades in over 0.5s
      await t.snap(page, "frame-library-toast");
      await page.getByRole("complementary", { name: "Your Library" }).getByText("Focus", { exact: true }).waitFor({ timeout: 5000 })
        .catch(() => { throw new Error(`the playlists didn't load after failing once (asked for ${tries.playlists} times)`); });
      if (tries.playlists !== 2) throw new Error(`playlists asked for ${tries.playlists} times, wanted 2`);
      if (tries.artists !== 1) throw new Error(`a 403 was asked for ${tries.artists} times, wanted once`);
      if (errors.length) throw new Error(errors.join("; "));
    } finally {
      await page.close();
    }
  }],
  ["frame-library-order", "/", async (p, t) => {
    // A slower, older load of a list can't overwrite a newer one: the playlists asked for at login answer (with only
    // the first playlist) after those asked for once a playlist is created.
    let first = true, release;
    const held = new Promise((resolve) => (release = resolve));
    await p.route((url) => url.pathname === "/v1/me/playlists", async (r) => {
      if (r.request().method() !== "GET" || !first) return r.fallback();
      first = false;
      await held;
      await r.fulfill({ json: { items: t.fixtures["/v1/me/playlists"].items.slice(0, 1), next: null } }).catch(() => {});
    });
    await p.reload();
    await p.getByRole("button", { name: "Create Playlist" }).click();
    const last = p.getByRole("complementary", { name: "Your Library" }).getByText("Focus", { exact: true });
    await last.waitFor({ timeout: 3000 });
    release();
    await p.waitForTimeout(500);
    if (!(await last.count())) throw new Error("the older load of the playlists overwrote the newer one");
  }],
];
