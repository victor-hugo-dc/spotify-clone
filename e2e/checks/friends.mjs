// Friends: the people Victor follows on Spotify who use this Shoutify. mock-spotify.mjs logs Ana and Bo in with their own
// refresh cookies and says Victor follows Ana, not Bo; Victor's next token refresh (when his page loads again) asks.
// Friend Activity in the right panel lists them and what they play; Social, pinned in Your Library, has their comments;
// the bell's What's New, now at /whats-new, keeps everyone's.
import { img, recentlyPlayed, track } from "../data.mjs";
import { as, comment, far, likeButton, likeState, main, replyButton, row as commentRow, settles, thread, box as replyBox, composer } from "./replies.mjs";
import { hasFocus } from "./comments.mjs";
import { until } from "./frame.mjs";
import { expectRows, focused, panel as library, recents, row } from "./library.mjs";

export const fixtures = {};

export const replaces = [
  // comments.mjs's Friend Activity listed comments; it lists friends now (friends-activity).
  "comment-friend-activity",
  // The bell's What's New moved to /whats-new.
  "frame-top-bar", "comment-flow-social", "reply-from-whats-new",
  // Social is pinned under Liked Songs, in every list of Your Library.
  "library-rows", "library-chips", "library-search", "library-sort", "library-empty", "library-short",
];

const panel = (p, name) => p.getByRole("complementary", { name });
const restorePanel = (p) => p.evaluate(() => localStorage.removeItem("shoutify:right-panel"));
// Logs `name` in, as their browser would, so the server knows them.
async function login(t, name) {
  const response = await fetch(`${t.base}/api/token`, { headers: { cookie: `refresh_key=${name}-refresh` } });
  if (!response.ok) throw new Error(`${name}'s login answered ${response.status}`);
}
// Ana plays Track One, half a minute in.
const anaPlays = { songID: track.id, songName: track.name, songArtist: "Artist One", songImage: img(2)[0].url, albumID: "al1", albumName: "Album One",
  playing: true, duration: track.duration_ms, position: 30000 };
const anaSays = "Ana's take, for the people who follow her", boSays = "Bo's take, which Victor doesn't follow";
// Your Library's rows with Social, pinned under Liked Songs (or first, under a chip that hides Liked Songs).
const withSocial = (rows) => rows[0] === "Liked Songs" ? ["Liked Songs", "Social", ...rows.slice(1)] : ["Social", ...rows];

export const checks = [
  // Ana and Bo play something; after Victor's refresh, Friend Activity lists Ana alone, playing now, with her song (to its
  // comments) and album. comments.mjs's comment-friend-activity checked who, what and the song's link, for comments.
  ["friends-activity", "/", async (p, t) => {
    await login(t, "ana");
    await login(t, "bo");
    await as(t, "Ana", "/activity", anaPlays);
    await as(t, "Bo", "/activity", { ...anaPlays, songName: "Bo's Song" });
    await p.reload({ waitUntil: "networkidle" });
    try {
      await p.getByRole("button", { name: "Friend Activity" }).click();
      const friends = panel(p, "Friend Activity").getByRole("listitem");
      await friends.first().waitFor({ timeout: 3000 });
      const names = await friends.locator(".friend-name").allInnerTexts();
      if (names.join() !== "Ana") throw new Error(`Friend Activity lists ${JSON.stringify(names)}`);
      const ana = friends.first();
      await ana.getByRole("img", { name: "Playing now" }).waitFor({ timeout: 3000 });
      if (await ana.locator("time").count()) throw new Error("says how long ago while playing");
      const song = ana.getByRole("link", { name: `${track.name} • Artist One`, exact: true });
      if ((await song.getAttribute("href")) !== `/comments/${track.id}`) throw new Error(`the song leads to ${await song.getAttribute("href")}`);
      if ((await ana.getByRole("link", { name: "Album One", exact: true }).getAttribute("href")) !== "/album/al1") throw new Error("the album doesn't lead to its page");
      await t.snap(p, "friends-panel");
      await song.click();
      await p.waitForURL(`**/comments/${track.id}`);
      await main(p).getByRole("heading", { name: track.name, exact: true }).waitFor({ timeout: 3000 });
    } finally {
      await restorePanel(p);
    }
  }],
  // Each state Spotify's panel shows: playing now (green bars, still with reduced motion), how long ago someone paused or
  // their song ended, and a friend with no activity yet; the initial for those without a picture.
  ["friends-panel-states", "/", async (p) => {
    const now = Date.now(), minute = 60 * 1000;
    const friends = [
      { id: "ana", name: "Ana", image: img(200)[0].url, activity: { ...anaPlays, at: now - minute } },
      { id: "cy", name: "Cy", image: null, activity: { ...anaPlays, songName: "Opening Night", songArtist: "Artist Two", albumID: "al2", albumName: "Album Two", playing: false, at: now - 12 * minute } },
      { id: "di", name: "Di", image: img(201)[0].url, activity: { ...anaPlays, songName: "Single Three", songArtist: "Artist One, Artist Two", albumID: "al3", albumName: "Single Three", position: 0, at: now - 3 * 60 * minute - track.duration_ms } },
      { id: "ed", name: "Ed", image: null, activity: null },
    ];
    await p.route("**/api/friends", (r) => r.fulfill({ json: { friends } }));
    try {
      await p.getByRole("button", { name: "Friend Activity" }).click();
      const rows = panel(p, "Friend Activity").getByRole("listitem");
      await rows.nth(3).waitFor({ timeout: 3000 });
      const at = async (n) => (await rows.nth(n).locator("time").count()) ? rows.nth(n).locator("time").innerText() : null;
      if (!(await rows.nth(0).getByRole("img", { name: "Playing now" }).count())) throw new Error("Ana isn't playing now");
      if ((await at(1)) !== "12m") throw new Error(`Cy paused ${await at(1)} ago`);
      // Di's song ended three hours ago, so it isn't playing now.
      if (await rows.nth(2).getByRole("img", { name: "Playing now" }).count() || (await at(2)) !== "3h") throw new Error(`Di: ${await at(2)}`);
      await rows.nth(3).getByText("Hasn't played anything on Shoutify yet.").waitFor({ timeout: 3000 });
      if ((await rows.nth(1).locator(".avatar-initial").innerText()) !== "C") throw new Error("Cy has no initial");
      const bars = rows.nth(0).locator(".equalizer > span").first();
      if ((await bars.evaluate((el) => getComputedStyle(el).animationName)) !== "equalize") throw new Error("the bars don't move");
      await p.emulateMedia({ reducedMotion: "reduce" });
      if ((await bars.evaluate((el) => getComputedStyle(el).animationName)) !== "none") throw new Error("the bars move with reduced motion");
      await p.emulateMedia({ reducedMotion: null });
    } finally {
      await restorePanel(p);
    }
  }],
  ["friends-panel-empty", "/", async (p) => {
    await p.route("**/api/friends", (r) => r.fulfill({ json: { friends: [] } }));
    try {
      await p.getByRole("button", { name: "Friend Activity" }).click();
      await panel(p, "Friend Activity").getByText("Follow friends on Spotify who use Shoutify and they'll show up here.").waitFor({ timeout: 3000 });
    } finally {
      await restorePanel(p);
    }
  }],
  // Victor's player says what he plays when the page loads, and again on pause; his newest play from Spotify's history
  // goes too, as of when he played it.
  ["friends-report", "/", async (p, t) => {
    const reports = [];
    p.on("request", (r) => r.method() === "POST" && r.url().endsWith("/api/activity") && reports.push(r.postDataJSON()));
    await p.reload({ waitUntil: "networkidle" });
    const { item } = t.fixtures["/v1/me/player"];
    const live = reports.filter((r) => r.at === undefined), last = recentlyPlayed[0];
    if (live.length !== 1) throw new Error(`${live.length} reports of what's playing: ${JSON.stringify(live)}`);
    const { position, ...rest } = live[0];
    const wanted = { songID: item.id, songName: item.name, songArtist: "Artist One", songImage: item.album.images[0].url, albumID: "al1", albumName: "Album One", playing: true, duration: item.duration_ms };
    if (JSON.stringify(rest) !== JSON.stringify(wanted) || !(position >= 1000 && position < 5000)) throw new Error(`reported ${JSON.stringify(live[0])}`);
    const history = reports.filter((r) => r.at !== undefined);
    if (history.length !== 1 || history[0].songID !== last.track.id || history[0].playing || history[0].at !== Date.parse(last.played_at)) throw new Error(`from history: ${JSON.stringify(history)}`);
    await p.locator(".player").getByRole("button", { name: "Pause", exact: true }).click();
    for (let i = 0; i < 20 && !reports.some((r) => r.playing === false && r.at === undefined); i++) await p.waitForTimeout(100);
    if (!reports.some((r) => r.playing === false && r.at === undefined && r.songID === item.id)) throw new Error(`no report of the pause: ${JSON.stringify(reports.slice(2))}`);
  }],
  // Social, pinned under Liked Songs, leads to /social: the comments of the people Victor follows (Ana), not Bo's, in the
  // same rows as What's New.
  ["social-feed", "/", async (p, t) => {
    await as(t, "Ana", "/comments/add", { songID: track.id, commentBody: anaSays, timestamp: 30000 });
    await as(t, "Bo", "/comments/add", { songID: track.id, commentBody: boSays, timestamp: 40000 });
    const social = row(p, "Social");
    if ((await social.getAttribute("href")) !== "/social") throw new Error(`Social leads to ${await social.getAttribute("href")}`);
    await social.click();
    await p.waitForURL("**/social");
    await main(p).getByRole("heading", { name: "Social", exact: true }).waitFor({ timeout: 3000 });
    const ana = commentRow(p, anaSays);
    await ana.waitFor({ timeout: 3000 });
    if (await main(p).getByText(boSays).count()) throw new Error("Bo's comment is in Victor's Social feed");
    if (await main(p).getByText("Victor", { exact: true }).count()) throw new Error("Victor's own comments are in his Social feed");
    await ana.getByText("Ana", { exact: true }).waitFor({ timeout: 3000 });
    await ana.locator(`a[href="/comments/${track.id}"]`).waitFor({ timeout: 3000 });
    await likeButton(ana).waitFor({ timeout: 3000 });
    await replyButton(ana).waitFor({ timeout: 3000 });
    // Its row is the page you're on.
    await until(p, () => document.querySelector(".library [aria-current=page] .library-row-name")?.textContent === "Social", "Social isn't the current page");
    if ((await social.evaluate((el) => getComputedStyle(el).backgroundColor)) !== "rgb(42, 42, 42)") throw new Error("Social's row isn't lit");
  }],
  // The bell leads to What's New, with everyone's comments.
  ["whats-new", "/", async (p) => {
    await p.getByRole("link", { name: "What's New" }).click();
    await p.waitForURL("**/whats-new");
    await main(p).getByRole("heading", { name: "What's New", exact: true }).waitFor({ timeout: 3000 });
    for (const text of [anaSays, boSays]) await commentRow(p, text).waitFor({ timeout: 3000 });
    if (await row(p, "Social").getAttribute("aria-current")) throw new Error("Social is current on What's New");
  }],

  // frame.mjs's frame-top-bar, with What's New at /whats-new.
  ["frame-top-bar-whats-new", "/", async (p) => {
    const home = p.getByRole("link", { name: "Home", exact: true });
    if ((await home.getAttribute("aria-current")) !== "page") throw new Error("home button isn't current on /");
    const install = p.getByRole("link", { name: "Install App" });
    if ((await install.getAttribute("href")) !== "https://www.spotify.com/download" || (await install.getAttribute("target")) !== "_blank")
      throw new Error("Install App doesn't open Spotify's download page in a new tab");
    await p.getByRole("link", { name: "Browse" }).click();
    await p.waitForURL((url) => url.pathname === "/search" && url.search === "");
    await until(p, () => !document.querySelector(".top-bar-home").hasAttribute("aria-current"), "home button still current on /search");
    await p.getByRole("link", { name: "What's New" }).click();
    await p.waitForURL("**/whats-new");
    const search = p.getByPlaceholder("What do you want to play?");
    await search.pressSequentially("track");
    await p.waitForURL((url) => url.pathname === "/search" && url.searchParams.get("q") === "track");
    await p.getByRole("button", { name: "Go back" }).click();
    await p.waitForURL("**/whats-new");
    await until(p, () => document.querySelector(".SearchInput").value === "", "search box kept its text after leaving the search");
    await search.pressSequentially("track");
    await p.waitForURL((url) => url.pathname === "/search" && url.searchParams.get("q") === "track");
    await p.goBack();
    await p.waitForURL("**/whats-new");
    await until(p, () => document.querySelector(".SearchInput").value === "", "search box kept its text after the browser's Back");
    if (!(await search.evaluate((input) => input === document.activeElement))) throw new Error("focus left the box, so Back wasn't tested with it there");
    await p.goForward();
    await p.waitForURL((url) => url.pathname === "/search" && url.searchParams.get("q") === "track");
    await until(p, () => document.querySelector(".SearchInput").value === "track", "search box didn't follow the browser's Forward");
    await p.getByRole("button", { name: "Victor: account menu" }).click();
    await p.getByRole("menuitem", { name: "Log out" }).waitFor({ timeout: 3000 });
    await p.keyboard.press("Escape");
  }],
  // comments.mjs's comment-flow-social: from the player's Comment button to What's New, with its author.
  ["comment-flow-whats-new", "/", async (p, t) => {
    await p.getByRole("button", { name: "Comment", exact: true }).click();
    await p.getByRole("textbox", { name: "Comment", exact: true }).fill("nice drop");
    await p.getByRole("button", { name: "Post", exact: true }).click();
    await p.getByRole("region", { name: "Comments" }).getByText("nice drop").first().waitFor({ timeout: 5000 });
    await p.goto(t.base + "/whats-new", { waitUntil: "networkidle" });
    await main(p).getByText("nice drop").first().waitFor({ timeout: 5000 });
    if (!(await main(p).getByText("Victor", { exact: true }).count())) throw new Error("comment has no author");
  }],
  // replies.mjs's reply-from-whats-new, at /whats-new: Like works in place, and Reply leads to the comment on its song's
  // page, scrolled to and lit up, with its composer open.
  ["reply-from-whats-new-page", "/whats-new", async (p, t) => {
    const target = "reply to this one from What's New";
    await comment(t, "Ana", target, { songID: far.id });
    for (let n = 1; n <= 8; n++) await comment(t, "Bo", `a newer one, number ${n}`, { songID: far.id });
    await p.reload({ waitUntil: "networkidle" });
    const like = likeButton(commentRow(p, target));
    await like.click();
    await settles(p, () => likeState(like), "true 1", "the like in What's New");
    await t.snap(p, "whats-new-actions");
    await replyButton(commentRow(p, target)).click();
    await p.waitForURL(`**/comments/${far.id}`);
    await hasFocus(replyBox(p), "the reply box");
    await composer(p).getByText("Replying to Ana", { exact: true }).waitFor({ timeout: 3000 });
    if (!(await thread(p, target).locator(".reply-composer").count())) throw new Error("the composer isn't under the comment");
    const landed = commentRow(p, target);
    const [rect, view] = await Promise.all([landed.boundingBox(), main(p).boundingBox()]);
    if (rect.y < view.y || rect.y + rect.height > view.y + view.height) throw new Error(`the comment at y=${rect.y} isn't in view (${view.y} to ${view.y + view.height})`);
    if ((await landed.evaluate((el) => getComputedStyle(el).animationName)) !== "comment-highlight") throw new Error("the comment isn't lit up");
  }],

  // library.mjs's checks, with Social. library-rows: Recents order; each row's subtitle (Social's says whose comments);
  // Liked Songs and Social pinned; covers (Social's a tile with its people icon), artists round.
  ["library-rows-social", "/", async (p, t) => {
    await expectRows(p, withSocial(recents), "rows aren't in Recents order");
    for (const [name, to] of [["Liked Songs", "/tracks"], ["Social", "/social"]]) {
      if ((await row(p, name).getAttribute("href")) !== to) throw new Error(`${name} doesn't lead to ${to}`);
      if (!(await row(p, name).getByRole("img", { name: "Pinned" }).count())) throw new Error(`${name} isn't pinned`);
    }
    for (const [name, wanted] of [["Liked Songs", `Playlist • ${t.fixtures["/v1/me/tracks"].total} songs`], ["Social", "Your friends' comments"],
      ["Mix", "Playlist • Victor"], ["Someone Else's Mix", "Playlist • Bob"], ["Single Three", "Album • Artist One, Artist Two"], ["Artist Two", "Artist"]]) {
      const subtitle = await row(p, name).locator(".library-row-subtitle").innerText();
      if (subtitle !== wanted) throw new Error(`${name} reads "${subtitle}", wanted "${wanted}"`);
    }
    await p.waitForFunction(() => [...document.querySelectorAll(".library img")].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 3000 })
      .catch(() => { throw new Error("a cover didn't load"); });
    if ((await library(p).locator("img").count()) !== recents.length - 1) throw new Error(`${await library(p).locator("img").count()} covers for ${recents.length} rows`);
    for (const name of ["Workout", "Social"])
      if (await row(p, name).locator("img").count() || !(await row(p, name).locator(".library-cover svg").count())) throw new Error(`${name} has no placeholder cover`);
    if (!(await row(p, "Social").locator(".library-cover").evaluate((el) => getComputedStyle(el).backgroundImage)).includes("gradient")) throw new Error("Social's tile isn't a gradient");
    if ((await row(p, "Artist Two").locator("img").evaluate((img) => getComputedStyle(img).borderRadius)) !== "50%") throw new Error("artist cover isn't round");
  }],
  // library-chips: one chip at a time, and Social whichever is on.
  ["library-chips-social", "/", async (p) => {
    const chip = (name) => library(p).getByRole("button", { name, exact: true });
    await expectRows(p, withSocial(recents), "rows didn't load");
    await chip("Artists").click();
    await expectRows(p, ["Social", "Artist One", "Artist Two"], "Artists shows more than artists");
    if ((await chip("Artists").getAttribute("aria-pressed")) !== "true") throw new Error("Artists isn't shown as on");
    if (await chip("Albums").count()) throw new Error("other chips still shown with Artists on");
    await chip("Clear filters").click();
    await expectRows(p, withSocial(recents), "Clear filters didn't bring everything back");
    if (!(await focused(chip("Artists")))) throw new Error("focus didn't stay on the chips");
    await chip("Albums").click();
    await expectRows(p, ["Social", "Album Two", "Single Three", "Album One"], "Albums shows more than albums");
    await chip("Albums").click();
    await expectRows(p, withSocial(recents), "pressing Albums again didn't clear it");
    await chip("Playlists").click();
    await expectRows(p, withSocial(recents.slice(0, 2).concat(["Road Trip", "Late Night", "Someone Else's Mix", "Workout", "Chill", "Throwbacks", "Focus"])),
      "Playlists shows more than playlists");
  }],
  // library-search: by name, owner or artist, whatever the case; Social only when the search matches it.
  ["library-search-social", "/", async (p) => {
    const open = library(p).getByRole("button", { name: "Search in your library" });
    const box = library(p).getByRole("textbox", { name: "Search in Your Library" });
    await expectRows(p, withSocial(recents), "rows didn't load");
    await open.click();
    if (!(await focused(box))) throw new Error("the search box didn't take focus");
    for (const [text, wanted] of [["mix", ["Mix", "Someone Else's Mix"]], ["BOB", ["Someone Else's Mix"]],
      ["artist two", ["Album Two", "Single Three", "Artist Two"]], ["liked", ["Liked Songs"]], ["SOC", ["Social"]], ["zzz", []]]) {
      await box.fill(text);
      await expectRows(p, wanted, `searching "${text}"`);
    }
    await library(p).getByText("Nothing in Your Library matches “zzz”.").waitFor({ timeout: 3000 });
    await box.press("Escape");
    await expectRows(p, withSocial(recents), "Escape didn't bring everything back");
    if (await box.count()) throw new Error("Escape didn't close the search box");
    if (!(await focused(open))) throw new Error("Escape didn't give focus back to the magnifier");
    await open.click();
    await box.fill("mix");
    await box.blur();
    if ((await box.inputValue()) !== "mix") throw new Error("leaving the search box lost the search");
    await box.fill("");
    await box.blur();
    await open.waitFor({ timeout: 3000 });
  }],
  // library-sort: the menu by keyboard, Escape and outside clicks; the pinned rows stay first whatever the sort.
  ["library-sort-social", "/", async (p, t) => {
    const menu = p.getByRole("menu", { name: "Sort by" });
    const option = (name) => menu.getByRole("menuitemradio", { name, exact: true });
    await expectRows(p, withSocial(recents), "rows didn't load");
    const recentsButton = library(p).getByRole("button", { name: "Recents", exact: true });
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
    await expectRows(p, withSocial(["Liked Songs", "Album One", "Album Two", "Artist One", "Artist Two", "Chill", "Focus", "Late Night", "Mix", "Road Trip",
      "Single Three", "Someone Else's Mix", "Throwbacks", "Workout"]), "Alphabetical didn't sort by name");
    const alphabetical = library(p).getByRole("button", { name: "Alphabetical", exact: true });
    if (!(await focused(alphabetical))) throw new Error("choosing a sort didn't give focus back to its button");
    await alphabetical.click();
    await menu.waitFor({ timeout: 3000 });
    await p.getByRole("banner").click({ position: { x: 300, y: 32 } });
    if (await menu.count()) throw new Error("a click elsewhere didn't close the menu");
    await p.getByRole("button", { name: "Alphabetical", exact: true }).waitFor({ timeout: 3000 });
  }],
  // library-empty: nothing saved, the panel says so once it knows (Social stays, as Liked Songs does).
  ["library-empty-social", "/", async (p, t) => {
    const lists = { "/v1/me/playlists": { items: [], next: null, total: 0 }, "/v1/me/albums": { items: [], next: null, total: 0 },
      "/v1/me/following": { artists: { items: [], next: null, total: 0 } } };
    const saved = Object.fromEntries(Object.keys(lists).map((path) => [path, t.fixtures[path]]));
    let release;
    const held = new Promise((resolve) => (release = resolve));
    await p.route((url) => url.pathname === "/v1/me/playlists", async (r) => { await held; await r.fallback().catch(() => {}); });
    Object.assign(t.fixtures, lists);
    try {
      await p.reload({ waitUntil: "domcontentloaded" });
      await expectRows(p, ["Liked Songs", "Social"], "rows shown for an empty library");
      await p.waitForTimeout(500);
      if (await library(p).locator(".library-note").count()) throw new Error(`said "${await library(p).locator(".library-note").innerText()}" while the playlists were loading`);
      release();
      await library(p).getByText("Playlists, albums and artists you save show up here.").waitFor({ timeout: 3000 });
      await library(p).getByRole("button", { name: "Artists", exact: true }).click();
      await library(p).getByText("Artists you follow show up here.").waitFor({ timeout: 3000 });
    } finally {
      Object.assign(t.fixtures, saved);
      release();
    }
  }],
  // library-short: in a short or narrow window the controls stay whole, and the list keeps room for rows and scrolls.
  ["library-short-social", "/", async (p) => {
    const controls = [["Create Playlist", "button"], ["Expand Your Library", "link"], ["Playlists", "button"], ["Artists", "button"],
      ["Albums", "button"], ["Search in your library", "button"], ["Recents", "button"]];
    await expectRows(p, withSocial(recents), "rows didn't load");
    for (const size of [{ width: 1280, height: 560 }, { width: 768, height: 560 }]) {
      await p.setViewportSize(size);
      await p.waitForTimeout(200);
      const box = await library(p).boundingBox();
      for (const [name, role] of controls) {
        const b = await library(p).getByRole(role, { name, exact: true }).boundingBox();
        if (!b || b.x < box.x || b.x + b.width > box.x + box.width || b.y < box.y || b.y + b.height > box.y + box.height)
          throw new Error(`${name} cut off at ${size.width}×${size.height}`);
      }
      const list = await library(p).getByRole("list").evaluate((ul) => ({ shown: ul.clientHeight, needed: ul.scrollHeight }));
      if (list.shown < 2 * 64) throw new Error(`list only ${list.shown}px tall at ${size.width}×${size.height}`);
      if (list.needed <= list.shown) throw new Error(`list doesn't scroll at ${size.width}×${size.height}`);
    }
  }],
];
