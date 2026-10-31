import { createContext } from "react";
import type { User } from "./types";

export const UserContext = createContext<User | null>(null);
export const TokenContext = createContext<string | null>(null);
export const MessageContext = createContext<(message: string) => void>(() => {});
export const PlayContext = createContext<() => void>(() => {});
export const SongContext = createContext<{ song: number; setSong: (song: number) => void }>({ song: 0, setSong: () => {} });
