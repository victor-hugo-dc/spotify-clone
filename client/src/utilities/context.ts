import { createContext } from "react";
import type { User } from "./types";

export const UserContext = createContext<User | null>(null);
export const TokenContext = createContext<string | null>(null);
export const MessageContext = createContext<(message: string) => void>(() => {});
export const PlayContext = createContext<() => void>(() => {});
export const SongContext = createContext<{ song: number; setSong: (song: number) => void }>({ song: 0, setSong: () => {} });

// What the player has loaded, so track lists and play buttons can show it.
export type NowPlaying = { trackUri: string | null; contextUri: string | null; playing: boolean };
export const NowPlayingContext = createContext<NowPlaying>({ trackUri: null, contextUri: null, playing: false });
