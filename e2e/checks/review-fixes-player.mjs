// Footer player checks. The default session plays on another device, which the player polls; inBrowser() makes this
// browser the active device instead, with a stand-in Web Playback SDK whose listeners a check calls as Spotify's would.

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
];
