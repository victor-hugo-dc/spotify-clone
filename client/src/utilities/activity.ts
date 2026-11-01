import { api } from './api.ts'
import type { Image } from './types.ts'

// What someone last played, as Shoutify's players report it: whether it was playing, and where in the song (ms) at `at`
// (ms since 1970).
export type Activity = {
    songID: string
    songName: string
    songArtist: string
    songImage: string | null
    albumID: string | null
    albumName: string | null
    playing: boolean
    duration: number
    position: number
    at: number
}

// Someone you follow on Spotify who uses Shoutify, and what they last played here (null until they have).
export type Friend = { id: string, name: string, image: string | null, activity: Activity | null }

// A track the player has loaded, or one from Spotify's history.
type Played = { id: string | null, uri: string, name: string, artists: { name: string }[], album?: { id: string | null, name: string, images: Image[] }, duration_ms: number }

// Tells your friends what you play: Spotify songs only. `at` is for plays from Spotify's history; without it, it's now.
// A report that fails is no loss: the next change sends another.
export function reportPlay(track: Played, playing: boolean, position: number, at?: number) {
    if (!track.id || !track.uri.startsWith('spotify:track:')) return
    api('/activity', {
        songID: track.id,
        songName: track.name,
        songArtist: track.artists.map((artist) => artist.name).join(', '),
        songImage: track.album?.images.at(-1)?.url ?? null,
        albumID: track.album?.id ?? null,
        albumName: track.album?.name || null,
        playing,
        duration: track.duration_ms,
        position,
        at,
    }).catch(() => {})
}

// Playing now: reported playing, and the song hasn't ended since (the position then plus the time since).
export const playingNow = (activity: Activity, now: number) => activity.playing && activity.position + now - activity.at < activity.duration

// When they last listened: when the song they had on ended, or when they paused it or it was reported from history.
export const lastPlayed = (activity: Activity) => activity.playing ? activity.at + activity.duration - activity.position : activity.at
