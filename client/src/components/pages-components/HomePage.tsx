import React, {useContext, useEffect, useReducer, useState} from 'react'

import CollectionRow from '../featured-components/CollectionRow'
import Shortcuts from '../home/Shortcuts'
import { pickShortcuts, recentContexts, type Context } from '../home/recent'
import { LibraryContext, NowPlayingContext } from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { Artist, Paging, Track } from '../../utilities/types'
import '../../styles/home.css'

const filters = ['All', 'Music', 'Podcasts'] as const

// Spotify's home: filter chips, shortcuts to what you played last, then one row of cards per shelf. Spotify no longer
// lets Development Mode apps browse its categories, so the shelves are your own: what you played, your top artists and
// songs, your playlists and albums.
export default function HomePage() {
    const {playlists, albums, refresh} = useContext(LibraryContext)
    const [filter, setFilter] = useState<typeof filters[number]>('All')
    const recent = useRecent()
    const topArtists = useTop<Artist>('artists')
    const topTracks = useTop<Track>('tracks')

    // Once another song starts, the one before has been played: load recently played again (one request).
    const song = useContext(NowPlayingContext).track?.uri
    useEffect(() => {
        if (song && lastSong && song !== lastSong) refresh('recent')
        if (song) lastSong = song
    }, [song, refresh])

    return (
        <div className='page-content home'>
            <div className='home-filters' role='group' aria-label='Filters'>
                {filters.map((name) =>
                    <button key={name} className='home-filter' aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>
                )}
            </div>
            {filter === 'Podcasts' ?
                <p className='empty-state'>Podcasts aren't in Shoutify yet.</p> :
                <div className='home-shelves'>
                    <Shortcuts items={pickShortcuts(recent, playlists)}/>
                    <Shelf name='Recently played' items={recent.filter((item) => typeof item !== 'string')}/>
                    <Shelf name='Your top artists' items={topArtists.items} error={topArtists.error}/>
                    <Shelf name='Your top songs' items={topTracks.items} error={topTracks.error}/>
                    <Shelf name='Your playlists' items={playlists} showAll='/collection/playlist'/>
                    <Shelf name='Your albums' items={albums.map(({album}) => album)} showAll='/collection/album'/>
                </div>
            }
        </div>
    )
}

// A shelf shows once it has cards; one that couldn't load says so in a line.
function Shelf({name, items, error, showAll}: {name: string, items: (Context | Track)[], error?: string, showAll?: string}) {
    if (error) return <p>Couldn't load {name.toLowerCase()}: {error}</p>
    return items.length > 0 && <CollectionRow name={name} playlists={items} oneRow showAll={showAll}/>
}

// The song playing when recently played was last loaded.
let lastSong: string | undefined

function useTop<T>(kind: 'artists' | 'tracks') {
    const [top, setTop] = useState<{items: T[], error?: string}>({items: []})
    useEffect(() => {
        const controller = new AbortController()
        spotify<Paging<T>>(`/me/top/${kind}?limit=10`, {signal: controller.signal})
            .then((page) => setTop({items: page.items}))
            .catch((error) => setTop({items: [], error: error.message}))
        return () => controller.abort()
    }, [kind])
    return top
}

// Contexts fetched this session, by URI (null: that failed), and the requests for them.
const fetched = new Map<string, Context | null>()
const requests = new Map<string, Promise<void>>()

function fetchContext(uri: string) {
    const [, type = '', id = ''] = uri.split(':')
    // A playlist's tracks aren't needed here, and can be many.
    const fields = type === 'playlist' ? '?fields=id,type,uri,name,description,images,owner(id,display_name)' : ''
    if (!requests.has(uri)) requests.set(uri, spotify<Context>(`/${type}s/${id}${fields}`).then(
        (context) => { fetched.set(uri, context) },
        () => { fetched.set(uri, null) },
    ))
    return requests.get(uri)!
}

// The contexts you played last (see recentContexts): those your library doesn't have are fetched, 8 at a time, once a
// session.
function useRecent() {
    const {playlists, albums, artists, recentlyPlayed} = useContext(LibraryContext)
    const [, rerender] = useReducer((n: number) => n + 1, 0)
    const recent = recentContexts(recentlyPlayed, [...playlists, ...albums.map(({album}) => album), ...artists], fetched)
    const missing = recent.filter((item) => typeof item === 'string').slice(0, 8).join()

    useEffect(() => {
        if (!missing) return
        let live = true
        Promise.all(missing.split(',').map(fetchContext)).then(() => { if (live) rerender() })
        return () => { live = false }
    }, [missing])

    return recent
}
