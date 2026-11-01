// Playing a song later in the queue, as on Spotify: the Web API can't jump there, so the app skips forward to it, one
// skip after another. The fake session plays Listed 3 with Listed 4, 5, 6, Album Two's first song and a single next.
export const fixtures = {};

const panel = (p, name) => p.getByRole("complementary", { name });
// The right panel each viewer last chose is remembered; back to the default, the Now playing view.
const restorePanel = (p) => p.evaluate(() => localStorage.removeItem("shoutify:right-panel"));
const skip = "POST /v1/me/player/next";

// The Queue panel, open, with a "Play <song>" button for each song next up.
async function openQueue(p, t) {
  await p.getByRole("button", { name: "Queue", exact: true }).click();
  const queue = panel(p, "Queue");
  const next = t.fixtures["/v1/me/player/queue"].queue;
  const rows = next.map((song) => queue.getByRole("button", { name: `Play ${song.name}`, exact: true }));
  await rows[0].waitFor({ timeout: 3000 });
  return { queue, rows };
}

// Holds each skip a moment and notes how many were waiting at once, which must never be more than one.
async function slowSkips(p) {
  const seen = { most: 0, now: 0 };
  await p.route("**/v1/me/player/next", async (r) => {
    seen.most = Math.max(seen.most, ++seen.now);
    await new Promise((done) => setTimeout(done, 100));
    seen.now--;
    await r.fallback();
  });
  return seen;
}

// `count` skips, one at a time, and nothing else sent to the player.
async function expectSkips(p, t, seen, count) {
  for (let waited = 0; t.sent.length < count && waited < 3000; waited += 100) await p.waitForTimeout(100);
  await p.waitForTimeout(400);
  if (t.sent.join() !== Array(count).fill(skip).join()) throw new Error(`sent ${JSON.stringify(t.sent)}`);
  if (seen.most > 1) throw new Error(`${seen.most} skips were sent at once`);
}

export const checks = [
  // Clicking the third song next up skips the two before it and the one playing.
  ["queue-play-click", "/", async (p, t) => {
    try {
      const { rows } = await openQueue(p, t);
      const seen = await slowSkips(p);
      t.sent.length = 0;
      await rows[2].click();
      // Clicks while it's skipping count for nothing.
      await rows[0].click();
      await expectSkips(p, t, seen, 3);
    } finally {
      await restorePanel(p);
    }
  }],
  // Tab to it and press Enter: the play icon shows on keyboard focus, and the same three skips.
  ["queue-play-keyboard", "/", async (p, t) => {
    try {
      const { rows } = await openQueue(p, t);
      const seen = await slowSkips(p);
      await rows[1].focus();
      await p.keyboard.press("Tab");
      if (!(await rows[2].evaluate((row) => row === document.activeElement))) throw new Error("Tab didn't move to the next song");
      if ((await rows[2].locator(".queue-row-play").evaluate((icon) => getComputedStyle(icon).opacity)) !== "1") throw new Error("no play icon on keyboard focus");
      t.sent.length = 0;
      await p.keyboard.press("Enter");
      await expectSkips(p, t, seen, 3);
    } finally {
      await restorePanel(p);
    }
  }],
  // The Now playing view's Next in queue plays the next song: one skip.
  ["queue-play-next-in-queue", "/", async (p, t) => {
    const next = t.fixtures["/v1/me/player/queue"].queue[0];
    const row = panel(p, "Now playing view").getByRole("button", { name: `Play ${next.name}`, exact: true });
    await row.waitFor({ timeout: 3000 });
    const seen = await slowSkips(p);
    t.sent.length = 0;
    await row.click();
    await expectSkips(p, t, seen, 1);
  }],
  // A skip that fails stops the rest and says why.
  ["queue-play-fails", "/", async (p, t) => {
    try {
      const { rows } = await openQueue(p, t);
      let skips = 0;
      await p.route("**/v1/me/player/next", (r) => {
        skips++;
        return r.fulfill({ status: 500, body: "" });
      });
      await rows[2].click();
      await p.getByText("ERROR: Spotify is having trouble (500), try again").waitFor({ timeout: 3000 });
      await p.waitForTimeout(400);
      if (skips !== 1) throw new Error(`${skips} skips sent after the first failed`);
    } finally {
      await restorePanel(p);
    }
  }],
  // Hovering a song next up shows the play icon over its cover, and only there; the song playing has no button.
  ["queue-play-hover", "/", async (p, t) => {
    try {
      const { queue, rows } = await openQueue(p, t);
      const { currently_playing } = t.fixtures["/v1/me/player/queue"];
      if (await queue.getByRole("button", { name: `Play ${currently_playing.name}` }).count()) throw new Error("the song playing is a button");
      const opacities = () => queue.locator(".queue-row-play").evaluateAll((icons) => icons.map((icon) => getComputedStyle(icon).opacity).join());
      if ((await opacities()) !== "0,0,0,0,0") throw new Error(`play icons before hover: ${await opacities()}`);
      await rows[2].hover();
      if ((await opacities()) !== "0,0,1,0,0") throw new Error(`play icons on hover: ${await opacities()}`);
      const [icon, cover] = await Promise.all([rows[2].locator(".queue-row-play").boundingBox(), rows[2].locator("img").boundingBox()]);
      if (JSON.stringify(icon) !== JSON.stringify(cover)) throw new Error(`icon at ${JSON.stringify(icon)}, cover at ${JSON.stringify(cover)}`);
      await t.snap(p, "queue-hover");
    } finally {
      await restorePanel(p);
    }
  }],
];
