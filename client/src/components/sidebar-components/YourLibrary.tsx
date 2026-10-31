import React, { useContext, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate } from 'react-router'

import Icon from '../icons'
import LibraryRow from './LibraryRow'
import SortMenu from './SortMenu'
import { libraryItems, matches, sortItems, type Item, type Kind, type Sort } from './library'
import { LibraryContext, MessageContext, NowPlayingContext, UserContext } from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { Playlist } from '../../utilities/types'
import '../../styles/library.css'

// The filter chips in Spotify's order: what each shows, from which list, and what to say while that list is empty.
const chips: {kind: Kind, label: string, list: 'playlists' | 'artists' | 'albums', empty: string}[] = [
    {kind: 'playlist', label: 'Playlists', list: 'playlists', empty: 'Playlists you make or save show up here.'},
    {kind: 'artist', label: 'Artists', list: 'artists', empty: 'Artists you follow show up here.'},
    {kind: 'album', label: 'Albums', list: 'albums', empty: 'Albums you save show up here.'},
]
const subtitle = (item: Item) => item.kind === 'artist' ? 'Artist' : `${item.kind === 'album' ? 'Album' : 'Playlist'} • ${item.by}`

// The left panel, Spotify's "Your Library": your playlists, albums and artists, Liked Songs pinned first, with filters,
// a search and a sort.
export default function YourLibrary() {
    const library = useContext(LibraryContext)
    const {playlists, albums, artists, recentlyPlayed, likedTotal, refresh} = library
    const user = useContext(UserContext)
    const {contextUri, playing} = useContext(NowPlayingContext)
    const setMessage = useContext(MessageContext)
    const navigate = useNavigate()
    const [chip, setChip] = useState<Kind | null>(null)
    const [sort, setSort] = useState<Sort>('recents')
    const [query, setQuery] = useState<string | null>(null) // null while the search box is closed
    const chipRow = useRef<HTMLDivElement>(null)
    const searchButton = useRef<HTMLButtonElement>(null)
    // App starts each list as an empty array and puts in a new one once it has loaded, even an empty one: a list that
    // is still the one this panel started with hasn't loaded, so its being empty says nothing yet.
    const [first] = useState(library)

    // New playlists get Spotify's default name, numbered the way its apps do.
    const createPlaylist = () => {
        spotify<Playlist>('/me/playlists', {method: 'POST', body: {name: `My Playlist #${playlists.length + 1}`}})
            .then((playlist) => {
                refresh()
                navigate(`/playlist/${playlist.id}`)
            })
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    const sorted = useMemo(() => sortItems(libraryItems(playlists, albums, artists), sort, recentlyPlayed), [playlists, albums, artists, sort, recentlyPlayed])
    const search = query?.trim() ?? ''
    const shown = sorted.filter((item) => (!chip || item.kind === chip) && matches(item, search))
    const liked = (!chip || chip === 'playlist') && matches({name: 'Liked Songs', by: ''}, search)
    const lists = chips.filter((c) => !chip || c.kind === chip)
    const failed = lists.filter((c) => library.failed.includes(c.list)).map((c) => c.list)
    const note = failed.length ? `Couldn't load your ${failed.join(' and ')}.` :
        shown.length || (search && liked) ? null :
        search ? `Nothing in Your Library matches “${search}”.` :
        lists.every((c) => library[c.list] !== first[c.list]) ? (chip ? lists[0]?.empty : 'Playlists, albums and artists you save show up here.') :
        null

    // Spotify's apps play Liked Songs as your collection.
    const collection = user && `spotify:user:${user.id}:collection`
    const inPlayer = (uri: string | null) => uri !== null && uri === contextUri

    // Escape empties and closes the search box, and focus goes back to the magnifier, which has to be back first.
    const closeSearch = () => {
        flushSync(() => setQuery(null))
        searchButton.current?.focus()
    }

    return (
        <aside className='library' aria-label='Your Library'>
            <div className='library-header'>
                <h2 className='library-title'>Your Library</h2>
                <button className='library-create no-outline' aria-label='Create Playlist' title='Create Playlist' onClick={createPlaylist}>
                    <Icon name='Plus' width='24' height='24'/>
                    Create
                </button>
                <Link to='/collection/playlist' className='library-icon-button no-outline' aria-label='Expand Your Library' title='Expand Your Library'>
                    <Icon name='Expand'/>
                </Link>
            </div>

            <div className='library-chips' role='group' aria-label='Filters' ref={chipRow}>
                {chip &&
                    <button className='library-chip library-chip-clear no-outline' aria-label='Clear filters' title='Clear filters' onClick={() => {
                        // Focus stays in the row, on the chip that was selected.
                        chipRow.current?.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus()
                        setChip(null)
                    }}>
                        <Icon name='Close' width='16' height='16'/>
                    </button>
                }
                {lists.map((c) => (
                    <button key={c.kind} className='library-chip no-outline' aria-pressed={chip === c.kind} onClick={() => setChip(chip === c.kind ? null : c.kind)}>
                        {c.label}
                    </button>
                ))}
            </div>

            <div className='library-tools'>
                {query === null ?
                    // Lower case: page checks find a playlist's save button by a name ending in "Your Library".
                    <button ref={searchButton} className='library-icon-button no-outline' aria-label='Search in your library' title='Search in your library' onClick={() => setQuery('')}>
                        <Icon name='N-Search'/>
                    </button> :
                    <label className='library-search'>
                        <span aria-hidden='true'><Icon name='N-Search'/></span>
                        <input autoFocus value={query} placeholder='Search in Your Library' aria-label='Search in Your Library' autoComplete='off' spellCheck='false'
                               onChange={(e) => setQuery(e.target.value)}
                               onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                               onBlur={() => !search && setQuery(null)}/>
                    </label>
                }
                <SortMenu sort={sort} onSort={setSort}/>
            </div>

            <ul className='other-list'>
                {liked &&
                    <LibraryRow to='/tracks' name='Liked Songs' image='https://misc.scdn.co/liked-songs/liked-songs-300.png' pinned
                                subtitle={likedTotal === null ? 'Playlist' : `Playlist • ${likedTotal.toLocaleString('en-US')} ${likedTotal === 1 ? 'song' : 'songs'}`}
                                loaded={inPlayer(collection)} playing={playing && inPlayer(collection)}/>
                }
                {shown.map((item) => (
                    <LibraryRow key={item.uri} to={`/${item.kind}/${item.id}`} name={item.name} subtitle={subtitle(item)} image={item.image}
                                round={item.kind === 'artist'} loaded={inPlayer(item.uri)} playing={playing && inPlayer(item.uri)}/>
                ))}
            </ul>
            {note && <p className='library-note'>{note}</p>}
        </aside>
    )
}
