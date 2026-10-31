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
    await p.getByRole("button", { name: "Victor: account menu" }).click();
    await p.getByRole("menuitem", { name: "Log out" }).waitFor({ timeout: 3000 });
    await p.keyboard.press("Escape");
  }],
  ["frame-right-panel", "/", async (p) => {
    const friends = p.getByRole("button", { name: "Friend Activity" });
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
      await friends.click();
      await p.locator(".right-sidebar").getByRole("button", { name: "Close" }).click();
      await p.locator(".right-sidebar").waitFor({ state: "detached", timeout: 3000 });
      // Each viewer's choice is remembered.
      await p.reload({ waitUntil: "networkidle" });
      if (await p.locator(".right-sidebar").count()) throw new Error("closed right panel came back after a reload");
    } finally {
      await p.evaluate(() => localStorage.removeItem("shoutify:right-panel"));
    }
  }],
  ["frame-narrow", "/", async (p) => {
    // Below 1100px the right panel gives its room to the page, and the top bar still fits.
    await p.setViewportSize({ width: 1000, height: 800 });
    if (await p.locator(".right-sidebar").isVisible()) throw new Error("right panel shown at 1000px");
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
];
