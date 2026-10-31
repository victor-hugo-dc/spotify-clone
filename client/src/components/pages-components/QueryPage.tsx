import React, {useContext, useEffect, useState} from 'react'
import SearchRow from '../featured-components/SearchRow'
import { spotify } from '../../utilities/spotify'
import { MessageContext } from '../../utilities/context'
import type { CardItem, Paging } from '../../utilities/types'

const rows = [['Songs', 'track'], ['Artists', 'artist'], ['Albums', 'album'], ['Playlists', 'playlist']] as const

export default function QueryPage({query}: {query: string}) {
    const setMessage = useContext(MessageContext)
    const [results, setResults] = useState<Record<string, Paging<CardItem | null>>>({})

    // One request for all four rows, sent once typing pauses (each keystroke used to send four).
    useEffect(() => {
        const q = query.trim()
        if (q === '') return
        const controller = new AbortController()
        const timer = setTimeout(() => {
            spotify<Record<string, Paging<CardItem | null>>>(`/search?q=${encodeURIComponent(q)}&type=track,artist,album,playlist&limit=9`, {signal: controller.signal})
                .then(setResults)
                .catch((error) => setMessage(`ERROR: ${error.message}`))
        }, 300)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    // eslint-disable-next-line
    }, [query])

    return (
        <div className="page-content">
            <div className='pageContent'>
                {rows.map(([title, type]) => (
                    // Spotify pads results with nulls for items it won't show.
                    <SearchRow key={type} title={title} items={(results[`${type}s`]?.items ?? []).filter((item) => item !== null)}/>
                ))}
            </div>
        </div>
    )
}
