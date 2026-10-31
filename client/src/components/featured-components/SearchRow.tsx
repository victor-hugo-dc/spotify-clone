import React, {useContext, useEffect, useState} from 'react'

import SearchRowTitle from './SearchRowTitle'
import SearchRowGrid from './SearchRowGrid'
import { spotify } from '../../utilities/spotify'
import { MessageContext, TokenContext } from '../../utilities/context'
import type { CardItem, Paging } from '../../utilities/types'

type Props = {title: string, type: 'track' | 'artist' | 'album' | 'playlist', query: string}

export default function SearchRow({title, type, query}: Props) {
    const [result, setResult] = useState<CardItem[]>([])
    const token = useContext(TokenContext)
    const setMessage = useContext(MessageContext)

    useEffect(() => {
        const controller = new AbortController()
        const q = query.trim()
        if (q.length > 0){
            spotify<Record<string, Paging<CardItem | null>>>(`/search?q=${encodeURIComponent(q)}&type=${type}&limit=9`, token, {signal: controller.signal})
                .then((data) => {
                    // Spotify pads results with nulls for items it won't show.
                    setResult((data[`${type}s`]?.items ?? []).filter((item) => item !== null))
                })
                .catch((error) => setMessage(`ERROR: ${error.message}`))
        }
        return () => controller.abort()
    // eslint-disable-next-line
    }, [query, type, token])


    return (
        <div className='CollectionRow' style={{display: result.length===0? 'none':'grid'}}>
            <SearchRowTitle title={title}/>
            <SearchRowGrid info={result}/>
        </div>
    )
}
