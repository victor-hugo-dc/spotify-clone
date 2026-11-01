// Footer player checks. The default session plays on another device, which the player polls; inBrowser() makes this
// browser the active device instead, with a stand-in Web Playback SDK whose listeners a check calls as Spotify's would.
import { img, track2 } from "../data.mjs";

const sdk = `window.Spotify = { Player: class {
  constructor() { this.listeners = {}; window.sdkPlayer = this; }
  addListener(event, cb) { this.listeners[event] = cb; return true; }
  connect() { setTimeout(() => this.listeners.ready({ device_id: "dev-1" }), 50); return Promise.resolve(true); }
  disconnect() {}
  activateElement() { return Promise.resolve(); }
} };
setTimeout(() => window.onSpotifyWebPlaybackSDKReady(), 0);`;

const isRead = (r) => r.method() === "GET" && new URL(r.url()).pathname === "/v1/me/player";

// Reloads with this browser ("dev-1") as the active device, so the player goes by SDK events and stops polling.
export async function inBrowser(p, t) {
  await p.route("https://sdk.scdn.co/**", (r) => r.fulfill({ contentType: "text/javascript", body: sdk }));
  await p.route((url) => url.pathname === "/v1/me/player", (r) => r.request().method() === "GET"
    ? r.fulfill({ json: { ...t.fixtures["/v1/me/player"], device: { id: "dev-1", volume_percent: 50 } } })
    : r.fallback());
  await p.reload({ waitUntil: "networkidle" });
}

// The SDK's player_state_changed while `track` plays here; null once playback has moved to another device.
export const sdkState = (p, track, extra = {}) => p.evaluate((state) => window.sdkPlayer.listeners.player_state_changed(state), track && {
  paused: false, shuffle: false, repeat_mode: 0, position: 1000, duration: track.duration_ms, context: null,
  track_window: { current_track: { ...track, linked_from: { uri: null } } }, ...extra,
});

export const checks = [
  // The SDK numbers repeat 1 for the playlist or album, 2 for this track.
  ["player-sdk-repeat", "/", async (p, t) => {
    await inBrowser(p, t);
    await sdkState(p, t.fixtures["/v1/me/player"].item, { repeat_mode: 1 });
    await p.getByRole("button", { name: "Enable repeat one", exact: true }).waitFor({ timeout: 3000 });
    await sdkState(p, t.fixtures["/v1/me/player"].item, { repeat_mode: 2 });
    await p.getByRole("button", { name: "Disable repeat", exact: true }).waitFor({ timeout: 3000 });
  }],
  // Once playback leaves this browser, through Devices or another device taking over, the player polls Spotify again.
  // The re-read after the switch is answered only after the SDK says playback left, still naming this browser.
  ["player-handoff", "/", async (p, t) => {
    await inBrowser(p, t);
    const devices = [{ id: "dev-1", name: "Spotify Clone Player", is_active: true }, { id: "phone", name: "Phone", is_active: false }];
    await p.route((url) => url.pathname === "/v1/me/player/devices", (r) => r.fulfill({ json: { devices } }));
    let switched = false, letGo;
    const held = new Promise((resolve) => (letGo = resolve));
    await p.route((url) => url.pathname === "/v1/me/player", async (r) => {
      if (r.request().method() === "PUT") switched = true;
      else if (switched) await held;
      return r.fallback();
    });
    const reread = p.waitForRequest((r) => switched && isRead(r), { timeout: 3000 });
    await p.getByRole("button", { name: "Devices", exact: true }).click();
    await p.getByRole("button", { name: "Phone", exact: true }).click();
    await reread.catch(() => { throw new Error("no re-read after switching to another device"); });
    await sdkState(p, null);
    const poll = p.waitForRequest(isRead, { timeout: 7000 });
    letGo();
    await poll.catch(() => { throw new Error("no polling after playback left this browser"); });
  }],
  // A read that Spotify answers after a command can describe playback from before it, so it's dropped: Pause stays done.
  ["player-stale-read", "/", async (p, t) => {
    // Reads asked before Pause say it's playing and wait for `early`; later ones say it's paused and wait for `late`.
    let paused = false, early, late;
    const gates = [new Promise((go) => (early = go)), new Promise((go) => (late = go))];
    await p.route((url) => url.pathname === "/v1/me/player/pause", (r) => { paused = true; return r.fallback(); });
    await p.route((url) => url.pathname === "/v1/me/player", async (r) => {
      const playing = !paused;
      await gates[playing ? 0 : 1];
      await r.fulfill({ json: { ...t.fixtures["/v1/me/player"], is_playing: playing } });
    });
    // Coming back into view, the tab asks Spotify, as a poll does.
    const asked = p.waitForRequest(isRead, { timeout: 3000 });
    await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await asked;
    const reread = p.waitForRequest((r) => paused && isRead(r), { timeout: 3000 });
    await p.getByRole("button", { name: "Pause", exact: true }).click();
    await p.getByRole("button", { name: "Play", exact: true }).waitFor({ timeout: 3000 });
    early();
    // The early answer has had half a second to land when the re-read after Pause goes out.
    await reread;
    if (!(await p.getByRole("button", { name: "Play", exact: true }).count())) throw new Error("an answer from before Pause showed it playing again");
    late();
  }],
  // The comment dialog stays on the song it opened on, even when the next one starts.
  ["player-comment-song", "/", async (p, t) => {
    await inBrowser(p, t);
    const first = t.fixtures["/v1/me/player"].item;
    await p.getByRole("button", { name: "Comment", exact: true }).click();
    const dialog = p.getByRole("dialog", { name: "Add Comment" });
    await dialog.getByLabel("Comment", { exact: true }).fill("about the first song");
    await sdkState(p, track2);
    await p.waitForFunction((name) => document.title.startsWith(name), track2.name, { timeout: 3000 });
    if (!(await dialog.getByText(first.name).count())) throw new Error(`dialog moved on: ${await dialog.innerText()}`);
    let posted;
    await p.route("**/api/comments/add", (r) => { posted = r.request().postDataJSON(); return r.fulfill({ json: {} }); });
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await p.getByText("Comment Added!").waitFor({ timeout: 3000 });
    if (posted?.songID !== first.id) throw new Error(`comment saved on ${posted?.songID}, not ${first.id}`);
  }],
  // An arrow key moves the volume 1%, and a change from a screen reader (no key or pointer events) is sent at once.
  // Spotify answers none of them until the end: presses in the meantime still add up, and the slider reads each out.
  ["player-slider-steps", "/", async (p, t) => {
    let answer;
    const answered = new Promise((resolve) => (answer = resolve));
    const isVolume = (r) => new URL(r.url()).pathname === "/v1/me/player/volume";
    await p.route((url) => url.pathname === "/v1/me/player/volume", async (r) => { await answered; await r.fallback(); });
    const volume = p.getByRole("slider", { name: "Volume" });
    const slider = await volume.elementHandle();
    const sent = [];
    const change = async (make) => {
      const request = p.waitForRequest(isVolume, { timeout: 3000 });
      await make();
      const percent = new URL((await request).url()).searchParams.get("volume_percent");
      sent.push(percent);
      await p.waitForFunction(([el, text]) => el.getAttribute("aria-valuetext") === text, [slider, `${percent}%`], { timeout: 3000 })
        .catch(async () => { throw new Error(`sent ${sent.join()}, but the slider reads ${await slider.getAttribute("aria-valuetext")}`); });
    };
    await volume.focus();
    for (let i = 0; i < 3; i++) await change(() => p.keyboard.press("ArrowRight"));
    const increment = () => slider.evaluate((el) => {
      el.stepUp();
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    for (let i = 0; i < 2; i++) await change(increment);
    answer();
    if (sent.join() !== "51,52,53,54,55") throw new Error(`volume went ${sent.join()}`);
    // A drag sends one seek, when it ends: the first seek sent is where the drag stopped, half way along.
    const seek = await p.getByRole("slider", { name: "Seek" }).boundingBox();
    const first = p.waitForRequest((r) => new URL(r.url()).pathname === "/v1/me/player/seek", { timeout: 3000 });
    await p.mouse.move(seek.x + seek.width / 4, seek.y + seek.height / 2);
    await p.mouse.down();
    await p.mouse.move(seek.x + seek.width / 2, seek.y + seek.height / 2, { steps: 5 });
    await p.mouse.up();
    const at = new URL((await first).url()).searchParams.get("position_ms") / t.fixtures["/v1/me/player"].item.duration_ms;
    if (Math.abs(at - 0.5) > 0.03) throw new Error(`first seek sent at ${at} of the track`);
  }],
  // Spotify leaves a podcast episode out (item: null) unless asked for episodes. Only songs on Spotify can be commented
  // on or annotated, though the Annotations button still leaves the annotations page.
  ["player-episode", "/", async (p, t) => {
    const episode = { id: "Episode000000000000001", type: "episode", uri: "spotify:episode:Episode000000000000001", name: "Episode One", duration_ms: 1800000, images: img(5) };
    await p.route((url) => url.pathname === "/v1/me/player", (r) => r.fulfill({ json: {
      ...t.fixtures["/v1/me/player"], context: null, currently_playing_type: "episode",
      item: new URL(r.request().url()).searchParams.get("additional_types")?.split(",").includes("episode") ? episode : null,
    } }));
    await p.reload({ waitUntil: "networkidle" });
    await p.waitForFunction((name) => document.title.startsWith(name), episode.name, { timeout: 3000 });
    for (const name of ["Podcasts and local files can't be commented on", "Podcasts and local files can't be annotated"])
      if (!(await p.getByRole("button", { name, exact: true }).isDisabled({ timeout: 3000 }).catch(() => false))) throw new Error(`no disabled "${name}" button`);
    await p.goto(t.base + "/annotations", { waitUntil: "networkidle" });
    await p.waitForFunction((name) => document.title.startsWith(name), episode.name, { timeout: 3000 });
    await p.getByRole("button", { name: "Annotations", exact: true }).click({ timeout: 3000 })
      .catch(() => { throw new Error("the Annotations button can't leave the annotations page"); });
    await p.waitForURL((url) => url.pathname === "/", { timeout: 3000 });
  }],
  // Devices opens the device picker: it says whether that's open, not whether music is playing.
  ["player-devices-button", "/", async (p) => {
    const devices = p.getByRole("button", { name: "Devices", exact: true });
    if ((await devices.getAttribute("aria-pressed")) !== null) throw new Error("Devices is announced as a pressed toggle");
    if ((await devices.getAttribute("aria-expanded")) !== "false") throw new Error("Devices doesn't say the picker is closed");
    await devices.click();
    await p.getByRole("button", { name: "Devices", exact: true, expanded: true }).waitFor({ timeout: 3000 });
    await p.keyboard.press("Escape");
  }],
];
