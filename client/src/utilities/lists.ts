import { totalLength } from "./time.ts";

// What a list holds, the way Spotify sums it up: "31 songs, about 1 hr 43 min". The length only once every song is
// loaded (a sum of the first pages would understate it); nothing when the count is unknown or there are no songs.
export function songStats(total: number | null | undefined, loaded: { duration_ms: number }[]) {
  if (!total) return undefined;
  const count = `${total.toLocaleString("en-US")} song${total === 1 ? "" : "s"}`;
  return loaded.length === total ? `${count}, ${totalLength(loaded.reduce((sum, song) => sum + song.duration_ms, 0))}` : count;
}

// [1, 2, 3, 4, 5] in twos -> [[1, 2], [3, 4], [5]]: Spotify caps how many items one request may name.
export const chunks = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
