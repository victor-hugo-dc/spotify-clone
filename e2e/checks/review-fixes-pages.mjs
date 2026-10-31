// Playlist page, Liked Songs and "• • •" menu checks from the pages review.
import { me } from "../data.mjs";

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
];
