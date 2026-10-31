import React, {useContext, useEffect, useState} from 'react'
import {useSearchParams} from 'react-router'
import SearchRow from '../featured-components/SearchRow'
import SearchRowGrid from '../featured-components/SearchRowGrid'
import TopResult from '../search/TopResult'
import SongRow from '../search/SongRow'
import { topResult } from '../search/topResult'
import { spotify } from '../../utilities/spotify'
import { MessageContext } from '../../utilities/context'
import type { Album, Artist, Paging, Playlist, Track } from '../../utilities/types'

type Results = {tracks?: Paging<Track | null>, artists?: Paging<Artist | null>, albums?: Paging<Album | null>, playlists?: Paging<Playlist | null>}

// The chips, and the kind of result each shows. The choice is in the URL (?type=), so Back returns to it.
const filters = [['All', ''], ['Songs', 'track'], ['Artists', 'artist'], ['Albums', 'album'], ['Playlists', 'playlist']] as const

// Spotify pads results with nulls for items it won't show.
const items = <T,>(page?: Paging<T | null>) => (page?.items ?? []).filter((item): item is T => item !== null)

export default function QueryPage({query}: {query: string}) {
    const setMessage = useContext(MessageContext)
    const [params, setParams] = useSearchParams()
    const [label, type] = filters.find(([, value]) => value === params.get('type')) ?? filters[0]
    const [results, setResults] = useState<Results>({})
    // The query the results are for, so "No results" isn't shown while a new search is on its way.
    const [answered, setAnswered] = useState('')
    const q = query.trim()

    // One request for every kind of result, sent once typing pauses.
    useEffect(() => {
        const controller = new AbortController()
        const timer = setTimeout(() => {
            spotify<Results>(`/search?q=${encodeURIComponent(q)}&type=track,artist,album,playlist&limit=10`, {signal: controller.signal})
                .then((data) => {
                    setResults(data)
                    setAnswered(q)
                })
                .catch((error) => setMessage(`ERROR: ${error.message}`))
        }, 300)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    // eslint-disable-next-line
    }, [q])

    const found = {track: items(results.tracks), artist: items(results.artists), album: items(results.albums), playlist: items(results.playlists)}
    if (!Object.values(found).some((list) => list.length)) {
        return answered === q &&
            <div className='page-content search-none' role='status'>
                <h2 className='search-heading'>{`No results found for "${answered}"`}</h2>
                <p>Please make sure your words are spelled correctly, or use fewer or different keywords.</p>
            </div>
    }

    const top = topResult(answered, {tracks: found.track, artists: found.artist, albums: found.album, playlists: found.playlist})
    const shown = type === '' ? null : found[type]
    return (
        <div className='page-content search-page'>
            <div className='search-chips'>
                {filters.map(([name, value]) => (
                    <button key={value} className='search-chip no-outline' aria-pressed={value === type}
                            onClick={() => setParams(value ? {q: query, type: value} : {q: query}, {replace: true})}>{name}</button>
                ))}
            </div>
            {shown === null ? <>
                <div className='search-top'>
                    {top &&
                        <section className='search-top-result' aria-label='Top result'>
                            <h2 className='search-heading'>Top result</h2>
                            <TopResult item={top}/>
                        </section>
                    }
                    {found.track.length > 0 &&
                        <section aria-label='Songs'>
                            <h2 className='search-heading'>Songs</h2>
                            <ul className='search-songs'>{found.track.slice(0, 4).map((track) => <SongRow key={track.id} track={track}/>)}</ul>
                        </section>
                    }
                </div>
                <SearchRow title='Artists' items={found.artist}/>
                <SearchRow title='Albums' items={found.album}/>
                <SearchRow title='Playlists' items={found.playlist}/>
            </> : shown.length === 0 ?
                <p className='empty-state'>{`No ${label.toLowerCase()} found for "${answered}".`}</p> :
            type === 'track' ?
                <ul className='search-songs'>{found.track.map((track) => <SongRow key={track.id} track={track} album/>)}</ul> :
                <SearchRowGrid info={shown} wrap/>
            }
        </div>
    )
}
