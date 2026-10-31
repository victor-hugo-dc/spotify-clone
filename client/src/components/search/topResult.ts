import type { Album, Artist, Playlist, Track } from '../../utilities/types'

export type Found = Track | Artist | Album | Playlist

// "Beyoncé!" -> "beyonce": case, accents and punctuation don't count.
const plain = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

// Spotify's "Top result", near enough: the first artist when the query is the start of their name (someone typing an
// artist's name), otherwise the first song; with no songs, the first artist, album or playlist.
export function topResult(query: string, found: {tracks: Track[], artists: Artist[], albums: Album[], playlists: Playlist[]}): Found | null {
    const q = plain(query)
    const artist = found.artists[0]
    const name = artist ? plain(artist.name) : ''
    if (artist && q && (name.startsWith(q) || name.replace(/^the /, '').startsWith(q))) return artist
    return found.tracks[0] ?? artist ?? found.albums[0] ?? found.playlists[0] ?? null
}
