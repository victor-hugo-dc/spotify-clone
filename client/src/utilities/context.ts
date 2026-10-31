import { createContext } from "react";
import type { Artist, Image, PlayHistory, Playlist, SavedAlbum, User } from "./types";

export const UserContext = createContext<User | null>(null);
export const MessageContext = createContext<(message: string) => void>(() => {});
export const PlayContext = createContext<() => void>(() => {});
export const SongContext = createContext<{ song: number; setSong: (song: number) => void }>({ song: 0, setSong: () => {} });

// The track the player has loaded. Local files and podcast episodes have no id, and no album or artist ids.
export type PlayingTrack = {
  id: string | null;
  uri: string;
  name: string;
  artists: { id: string | null; name: string }[];
  album: { id: string | null; name: string; images: Image[] };
  duration_ms: number;
};

// What the player has loaded, so track lists and play buttons can show it.
// deviceId is this browser's Web Playback SDK player, once it's ready; device is the active one, wherever it is.
export type NowPlaying = {
  trackUri: string | null;
  contextUri: string | null;
  playing: boolean;
  deviceId: string | null;
  track: PlayingTrack | null;
  device: { id: string | null; name: string } | null;
};
export const NowPlayingContext = createContext<NowPlaying>({ trackUri: null, contextUri: null, playing: false, deviceId: null, track: null, device: null });

// The player's clock, for pages that follow playback: the loaded track, and its position (ms) as read at `at`
// (Date.now()), moving on while `play` (positionAt() in time.ts works it out). It changes with playback, not every tick.
export type PlaybackClock = { uri: string | null; play: boolean; progress: number; at: number; total_time: number };
export const PlaybackClockContext = createContext<PlaybackClock>({ uri: null, play: false, progress: 0, at: 0, total_time: 0 });
// Moves the loaded track to a position (ms), as the player's seek bar does.
export const SeekContext = createContext<(ms: number) => void>(() => {});

// Which view the right panel shows, or null when it's closed. App keeps it, remembered per browser. `wide`: the window
// has room for the panel (1100px and up); when it hasn't, the panel and every button that opens it are hidden.
export type RightPanel = "now-playing" | "queue" | "friends" | null;
export const LayoutContext = createContext<{ rightPanel: RightPanel; setRightPanel: (panel: RightPanel) => void; wide: boolean }>({
  rightPanel: null,
  setRightPanel: () => {},
  wide: true,
});

// Your Library, loaded by App at login: every playlist, saved album and followed artist, the last 50 plays, and how many
// songs are liked (null until known). refresh(kind) loads one list again after a change; refresh() loads them all.
export type LibraryKind = "playlists" | "albums" | "artists" | "recent" | "liked";
export type Library = {
  playlists: Playlist[];
  albums: SavedAlbum[];
  artists: Artist[];
  recentlyPlayed: PlayHistory[];
  likedTotal: number | null;
  // The lists whose latest load failed, even after retries.
  failed: LibraryKind[];
  refresh: (kind?: LibraryKind) => void;
};
export const LibraryContext = createContext<Library>({ playlists: [], albums: [], artists: [], recentlyPlayed: [], likedTotal: null, failed: [], refresh: () => {} });
