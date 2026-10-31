import type { Artist, Image, PlayHistory, Playlist, SavedAlbum } from '../../utilities/types.ts'

export type Kind = 'playlist' | 'album' | 'artist'
// A row of Your Library. `by`: a playlist's owner or an album's artists (artists have none); `added`: when an album
// was saved.
export type Item = { kind: Kind; id: string; uri: string; name: string; by: string; image?: string; added?: string }
export type Sort = 'recents' | 'added' | 'alphabetical' | 'creator'

// Spotify lists covers largest first (640, 300, 64px): the second is plenty for a 48px cover on a sharp screen.
const cover = (images: Image[] | null | undefined) => (images?.[1] ?? images?.[0])?.url

// Everything in Your Library, in the order Spotify gives each list: playlists, then albums, then artists.
export const libraryItems = (playlists: Playlist[], albums: SavedAlbum[], artists: Artist[]): Item[] => [
    // Spotify can send null for a playlist it can't show.
    ...playlists.filter(Boolean).map((p): Item => ({kind: 'playlist', id: p.id, uri: p.uri, name: p.name, by: p.owner.display_name ?? p.owner.id, image: cover(p.images)})),
    ...albums.map(({album, added_at}): Item => ({kind: 'album', id: album.id, uri: album.uri, name: album.name, by: album.artists.map((a) => a.name).join(', '), image: cover(album.images), added: added_at})),
    ...artists.map((a): Item => ({kind: 'artist', id: a.id, uri: a.uri, name: a.name, by: '', image: cover(a.images)})),
]

// Search in Your Library: the name, owner or artists contain the text, whatever the case.
export const matches = (item: {name: string, by: string}, text: string) =>
    [item.name, item.by].some((field) => field.toLocaleLowerCase().includes(text.trim().toLocaleLowerCase()))

const collator = new Intl.Collator(undefined, {sensitivity: 'base', numeric: true})
const groups: Record<Kind, number> = {playlist: 0, album: 1, artist: 2}

// The sort menu's orders. Ties keep Spotify's order (sort is stable).
// recents: the latest play from each item first (`played` is /me/player/recently-played), never-played ones after.
// added: only saved albums say when, so they go newest first between the playlists and the artists.
// creator: by owner or artist; an artist is its own creator.
export function sortItems(items: Item[], sort: Sort, played: PlayHistory[]): Item[] {
    const sorted = [...items]
    switch (sort) {
        case 'recents': {
            const last = new Map<string, number>()
            for (const {context, played_at} of played)
                if (context) last.set(context.uri, Math.max(last.get(context.uri) ?? 0, Date.parse(played_at)))
            return sorted.sort((a, b) => (last.get(b.uri) ?? 0) - (last.get(a.uri) ?? 0))
        }
        case 'added':
            return sorted.sort((a, b) => groups[a.kind] - groups[b.kind] || (a.added && b.added ? Date.parse(b.added) - Date.parse(a.added) : 0))
        case 'alphabetical':
            return sorted.sort((a, b) => collator.compare(a.name, b.name))
        case 'creator':
            return sorted.sort((a, b) => collator.compare(a.by || a.name, b.by || b.name))
    }
}
