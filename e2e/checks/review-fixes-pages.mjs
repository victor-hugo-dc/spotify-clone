// Playlist page, Liked Songs and "• • •" menu checks from the pages review.
import { me, playlist, track2 } from "../data.mjs";

// How Spotify lists a local file in a playlist: no id, so the app leaves it out.
const local = (n) => ({ item: { id: null, uri: `spotify:local:Me:Tape:Song+${n}:180`, name: `Local Song ${n}`, type: "track", is_local: true, duration_ms: 180000, explicit: false, album: { uri: null, name: "Tape", images: [] }, artists: [{ uri: null, name: "Me" }] } });

export const fixtures = {
  "/v1/playlists/plocal": { ...playlist, id: "plocal", name: "Tape Mix", uri: "spotify:playlist:plocal", description: "", items: { items: [local(1), local(2), { item: null }], next: "https://api.spotify.com/v1/playlists/plocal/items?offset=3" } },
  "/v1/playlists/plocal/items": { items: [{ item: track2 }], next: null },
};

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
  // A failed save keeps the dialog and what was typed; a name of only spaces isn't saved.
  ["edit-details-save-fails", "/playlist/p1", async (p, t) => {
    await p.getByRole("button", { name: "More options for Mix" }).click();
    await p.getByRole("menuitem", { name: "Edit details" }).click();
    const dialog = p.getByRole("dialog", { name: "Edit details" });
    const name = dialog.getByLabel("Name"), description = dialog.getByLabel("Description"), save = dialog.getByRole("button", { name: "Save" });
    t.sent.length = 0;
    await name.fill("   ");
    await save.click();
    await p.waitForTimeout(300);
    if (t.sent.some((c) => c.startsWith("PUT /v1/playlists/"))) throw new Error("saved a name of only spaces");
    await name.fill("Kept Name");
    await description.fill("kept description");
    // The connection drops, faked as a rejected fetch: an error status would also log a console error, failing the check.
    await p.evaluate(() => {
      const real = window.fetch;
      window.fetch = (input, init) => init?.method === "PUT" ? ((window.fetch = real), Promise.reject(new TypeError("Failed to fetch"))) : real(input, init);
    });
    await save.click();
    await p.getByText("ERROR: Failed to fetch").waitFor({ timeout: 3000 });
    if (!(await dialog.isVisible())) throw new Error("dialog closed after a failed save");
    if ((await name.inputValue()) !== "Kept Name" || (await description.inputValue()) !== "kept description") throw new Error("typed details lost after a failed save");
    await save.click();
    await p.getByRole("heading", { name: "Kept Name" }).waitFor({ timeout: 3000 });
    if (await dialog.isVisible()) throw new Error("dialog stayed open after saving");
  }],
  // A first page with nothing to list (local files) still leads on to the next one.
  ["playlist-local-files", "/playlist/plocal", (p) => p.getByText("Track Two").waitFor({ timeout: 5000 })],
];
