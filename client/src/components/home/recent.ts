import type { Album, Artist, LinkCard, PlayHistory, Playlist } from '../../utilities/types'

// What you can play from: a playlist, an album or an artist.
export type Context = Playlist | Album | Artist

export const likedSongs: LinkCard = {type: 'link', id: 'liked-songs', to: '/tracks', description: '', name: 'Liked Songs', images: [{url: 'https://misc.scdn.co/liked-songs/liked-songs-300.png'}]}

// The contexts you played from, newest first and each once; a song played without one counts as its album. Each comes
// from Your Library (`library`), the song's own album, or `fetched` (by URI; null when that failed, so it's left out).
// One found nowhere yet comes back as its URI, for the caller to fetch.
export function recentContexts(plays: PlayHistory[], library: Context[], fetched: Map<string, Context | null>) {
    const inLibrary = new Map(library.map((item) => [item.uri, item]))
    const seen = new Set<string>()
    const contexts: (Context | string)[] = []
    for (const {track, context} of plays) {
        const uri = context ? context.uri : track.album?.uri
        // Liked Songs ("collection"), podcasts and local files have nothing to show here.
        if (!uri || seen.has(uri) || !/^spotify:(playlist|album|artist):/.test(uri)) continue
        seen.add(uri)
        const found = inLibrary.get(uri) ?? (track.album?.uri === uri ? track.album : fetched.get(uri))
        if (found !== null) contexts.push(found ?? uri)
    }
    return contexts
}

// Home's shortcut grid: Liked Songs, then the contexts you played last, topped up from your playlists; 8 at most.
export function pickShortcuts(recent: (Context | string)[], playlists: Playlist[]): (LinkCard | Context | string)[] {
    const shown = new Set(recent.map((item) => typeof item === 'string' ? item : item.uri))
    return [likedSongs, ...recent, ...playlists.filter((playlist) => !shown.has(playlist.uri))].slice(0, 8)
}
