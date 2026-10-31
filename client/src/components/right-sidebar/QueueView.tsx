import React, { useContext } from 'react'

import useQueue, { type QueueItem } from './useQueue'
import { NowPlayingContext } from '../../utilities/context'

// One song in the queue: cover, title (green while it plays) and artists, or an episode's show.
export function QueueRow({ item, current = false }: { item: QueueItem; current?: boolean }) {
    const cover = (item.album?.images ?? item.images)?.at(-1)?.url
    const by = item.artists?.map((artist) => artist.name).join(', ') ?? item.show?.name
    return (
        <div className={`queue-row${current ? ' current' : ''}`}>
            {cover ? <img src={cover} alt='' /> : <div className='queue-row-cover' />}
            <div className='queue-row-text'>
                <div className='queue-row-name ellipsis-one-line'>{item.name}</div>
                {by && <div className='queue-row-by ellipsis-one-line'>{by}</div>}
            </div>
        </div>
    )
}

// The right panel's Queue: what's playing, then what's next.
export default function QueueView() {
    const { track } = useContext(NowPlayingContext)
    const queue = useQueue(track?.uri)

    if (queue === undefined) return null
    if (queue === null) return <p className='right-sidebar-note' role='alert'>Couldn't load your queue. Try again in a moment.</p>
    return (
        <div className='queue-view'>
            {queue.currently_playing && <>
                <h2>Now playing</h2>
                <QueueRow item={queue.currently_playing} current />
            </>}
            <h2>Next up</h2>
            {queue.queue.length ?
                // The same song can be queued twice.
                queue.queue.map((item, index) => <QueueRow key={index} item={item} />) :
                <p className='right-sidebar-note'>Nothing's queued up.</p>}
        </div>
    )
}
