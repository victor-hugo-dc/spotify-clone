import { api } from "./api.ts";
import { spotify } from "./spotify.ts";
import type { Album, Notification, Paging } from "./types.ts";

// What's New: Shoutify's notifications and the last 30 days' releases of the artists you follow, in one list by time. A
// release's time is its release day (midnight, local time), so it says "new" once that day has come since you last looked.
export type Release = { kind: "release"; at: number; album: Album };
export type Item = Notification | Release;
export type Filter = "All" | "Music" | "Comments";
export type Notifications = { notifications: Notification[]; seenAt: number | null };

const DAY = 24 * 60 * 60 * 1000;

// Spotify dates some releases only to the month or year; those can't be placed, so they count as old (NaN).
const releasedAt = (album: Album) => (album.release_date_precision === "day" ? Date.parse(`${album.release_date}T00:00`) : NaN);
const isRecent = (album: Album, now: number) => now - releasedAt(album) <= 30 * DAY;

// The artists' recent releases, each once (an album by two artists you follow comes up under both), newest first.
export function recentReleases(albums: Album[], now = Date.now()): Release[] {
  const releases = new Map<string, Release>();
  for (const album of albums) if (isRecent(album, now)) releases.set(album.id, { kind: "release", at: releasedAt(album), album });
  return [...releases.values()].sort((a, b) => b.at - a.at);
}

// What's New's list under a chip, newest first: Music is the releases, Comments Shoutify's notifications.
export const whatsNew = (notifications: Notification[], releases: Release[], filter: Filter): Item[] =>
  [...(filter === "Comments" ? [] : releases), ...(filter === "Music" ? [] : notifications)].sort((a, b) => b.at - a.at);

// Whether an item came since you last opened What's New (null: you never have).
export const isNew = (item: Item, seenAt: number | null) => seenAt === null || item.at > seenAt;

// Everyone on this Shoutify shares one request quota: at most 3 requests at a time, whoever asks, and the slot of one
// that ends goes straight to the next in line.
let running = 0;
const waiting: (() => void)[] = [];
async function inTurn<T>(request: () => Promise<T>) {
  if (running < 3) running++;
  else await new Promise<void>((resolve) => waiting.push(resolve));
  try {
    return await request();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

// An artist's recent albums and singles, from their latest 10 (Spotify's most). Kept in this browser for 12 hours, and
// shared while asked, so the bell and What's New ask once. Storage can be blocked; then Spotify is asked each time.
const TTL = 12 * 60 * 60 * 1000;
const asking = new Map<string, Promise<Album[]>>();
function artistReleases(id: string) {
  const key = `shoutify:releases:${id}`;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (saved && Date.now() - saved.at < TTL) return Promise.resolve<Album[]>(saved.albums);
  } catch {
    // blocked or garbled: ask Spotify
  }
  let albums = asking.get(id);
  if (!albums) {
    albums = inTurn(() => spotify<Paging<Album>>(`/artists/${id}/albums?include_groups=album,single&limit=10`))
      .then(({ items }) => {
        // Only the recent ones: whole answers for every artist you follow could fill the browser's storage.
        const recent = items.filter((album) => isRecent(album, Date.now()));
        try {
          localStorage.setItem(key, JSON.stringify({ at: Date.now(), albums: recent }));
        } catch {
          // blocked or full: asked again next time
        }
        return recent;
      })
      .finally(() => asking.delete(id));
    asking.set(id, albums);
  }
  return albums;
}

// The recent releases of these artists. An artist Spotify can't answer for is left out, and asked again next time.
export async function loadReleases(artistIds: string[]) {
  const answers = await Promise.all(artistIds.map((id) => artistReleases(id).catch(() => [])));
  return recentReleases(answers.flat());
}

const SEEN = "shoutify:notifications-seen";

// What's New was opened: everything up to now is seen, and the bell checks again.
export const markSeen = () => api("/notifications/seen", {}).then(() => window.dispatchEvent(new Event(SEEN)));
export function onSeen(listener: () => void) {
  window.addEventListener(SEEN, listener);
  return () => window.removeEventListener(SEEN, listener);
}
