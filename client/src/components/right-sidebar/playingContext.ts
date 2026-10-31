import type { Library, PlayingTrack } from '../../utilities/context'

// What the song plays from, for the Now playing view's header: Liked Songs, or a playlist, album or artist, with its page.
// Your Library has the names of what's in it, and the song those of its own album and artists.
// shortcut: anything else (a playlist found by search) is "Now playing"; look its name up if people miss it.
export function playingContext(uri: string | null, library: Pick<Library, 'playlists' | 'albums' | 'artists'>, track: PlayingTrack | null) {
    // Liked Songs plays as spotify:user:<id>:collection.
    if (uri?.endsWith(':collection')) return { name: 'Liked Songs', path: '/tracks' }
    const [, kind, id] = uri?.split(':') ?? []
    const name =
        kind === 'playlist' ? library.playlists.find((playlist) => playlist.uri === uri)?.name :
        kind === 'album' ? library.albums.find(({ album }) => album.uri === uri)?.album.name ?? (id === track?.album.id ? track?.album.name : undefined) :
        kind === 'artist' ? library.artists.find((artist) => artist.uri === uri)?.name ?? track?.artists.find((artist) => artist.id === id)?.name :
        undefined
    return name ? { name, path: `/${kind}/${id}` } : { name: 'Now playing', path: null }
}
