// Footer player checks. The default session plays on another device, which the player polls; inBrowser() makes this
// browser the active device instead, with a stand-in Web Playback SDK whose listeners a check calls as Spotify's would.
import { track2 } from "../data.mjs";

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
async function inBrowser(p, t) {
  await p.route("https://sdk.scdn.co/**", (r) => r.fulfill({ contentType: "text/javascript", body: sdk }));
  await p.route((url) => url.pathname === "/v1/me/player", (r) => r.request().method() === "GET"
    ? r.fulfill({ json: { ...t.fixtures["/v1/me/player"], device: { id: "dev-1", volume_percent: 50 } } })
    : r.fallback());
  await p.reload({ waitUntil: "networkidle" });
}

// The SDK's player_state_changed while `track` plays here; null once playback has moved to another device.
const sdkState = (p, track, extra = {}) => p.evaluate((state) => window.sdkPlayer.listeners.player_state_changed(state), track && {
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
  // Once playback leaves this browser, through Devices or another device taking over, the player asks Spotify again.
  ["player-handoff", "/", async (p, t) => {
    await inBrowser(p, t);
    const devices = [{ id: "dev-1", name: "Spotify Clone Player", is_active: true }, { id: "phone", name: "Phone", is_active: false }];
    await p.route((url) => url.pathname === "/v1/me/player/devices", (r) => r.fulfill({ json: { devices } }));
    await p.getByRole("button", { name: "Devices", exact: true }).click();
    await p.getByRole("button", { name: "Phone", exact: true }).waitFor({ timeout: 3000 });
    let read = p.waitForRequest(isRead, { timeout: 2000 });
    await p.getByRole("button", { name: "Phone", exact: true }).click();
    await read.catch(() => { throw new Error("no re-read after switching to another device"); });
    read = p.waitForRequest(isRead, { timeout: 7000 });
    await sdkState(p, null);
    await read.catch(() => { throw new Error("no polling after playback left this browser"); });
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
  ["player-slider-steps", "/", async (p, t) => {
    t.sent.length = 0;
    const volume = p.getByRole("slider", { name: "Volume" });
    await volume.focus();
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(300);
    if (!t.sent.some((c) => c.endsWith("volume_percent=51"))) throw new Error(`arrow key sent ${JSON.stringify(t.sent)}`);
    if ((await volume.getAttribute("aria-valuetext")) !== "51%") throw new Error(`volume reads ${await volume.getAttribute("aria-valuetext")}`);
    t.sent.length = 0;
    await volume.evaluate((el) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "40");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await p.waitForTimeout(300);
    if (!t.sent.some((c) => c.endsWith("volume_percent=40"))) throw new Error(`screen reader change sent ${JSON.stringify(t.sent)}`);
    // A drag sends one seek, when it ends.
    t.sent.length = 0;
    const seek = await p.getByRole("slider", { name: "Seek" }).boundingBox();
    await p.mouse.move(seek.x + seek.width / 4, seek.y + seek.height / 2);
    await p.mouse.down();
    await p.mouse.move(seek.x + seek.width / 2, seek.y + seek.height / 2, { steps: 5 });
    await p.mouse.up();
    await p.waitForTimeout(300);
    const seeks = t.sent.filter((c) => c.includes("/seek?"));
    if (seeks.length !== 1) throw new Error(`drag sent ${JSON.stringify(seeks)}`);
  }],
];
