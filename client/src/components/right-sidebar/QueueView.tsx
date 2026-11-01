import React, { useContext } from 'react'

import Icon from '../icons'
import useQueue, { useSkipTo, type QueueItem } from './useQueue'
import { NowPlayingContext } from '../../utilities/context'

// One song in the queue: cover, title (green while it plays) and artists, or an episode's show. With `onPlay` it's a
// button, with a play icon over the cover on hover or focus, as in Spotify's queue.
export function QueueRow({ item, current = false, onPlay }: { item: QueueItem; current?: boolean; onPlay?: () => void }) {
    const cover = (item.album?.images ?? item.images)?.at(-1)?.url
    const by = item.artists?.map((artist) => artist.name).join(', ') ?? item.show?.name
    const content = <>
        {cover ? <img src={cover} alt='' /> : <div className='queue-row-cover' />}
        {onPlay && <span className='queue-row-play'><Icon name='Play' width='16' height='16' /></span>}
        <div className='queue-row-text'>
            <div className='queue-row-name ellipsis-one-line'>{item.name}</div>
            {by && <div className='queue-row-by ellipsis-one-line'>{by}</div>}
        </div>
    </>
    return onPlay ?
        <button className='queue-row no-outline' aria-label={`Play ${item.name}`} onClick={onPlay}>{content}</button> :
        <div className={`queue-row${current ? ' current' : ''}`}>{content}</div>
}

// The right panel's Queue: what's playing, then what's next.
export default function QueueView() {
    const { track } = useContext(NowPlayingContext)
    const queue = useQueue(track?.uri)
    const skipTo = useSkipTo()

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
                queue.queue.map((item, index) => <QueueRow key={index} item={item} onPlay={() => skipTo(index + 1)} />) :
                <p className='right-sidebar-note'>Nothing's queued up.</p>}
        </div>
    )
}
