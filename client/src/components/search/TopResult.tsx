import React from 'react'
import {Link} from 'react-router'
import Icon from '../icons'
import usePlayback from '../../utilities/hooks/usePlayback'
import type { Found } from './topResult'

const kinds = {track: 'Song', artist: 'Artist', album: 'Album', playlist: 'Playlist'}

// The big card at the start of the results: the cover, the name, who it's by and what it is, and a play button.
export default function TopResult({item}: {item: Found}) {
    const {isPlaying, toggle} = usePlayback()
    const playing = isPlaying(item.uri)
    const image = (item.type === 'track' ? item.album?.images : item.images)?.[0]?.url
    const to = item.type === 'track' ? `/album/${item.album?.id}?highlight=${item.id}` : `/${item.type}/${item.id}`
    const by = item.type === 'playlist' ? item.owner.display_name && `By ${item.owner.display_name}` : item.type === 'artist' ? null : item.artists.map((artist) => artist.name).join(', ')

    return (
        <div className='top-result'>
            <Link to={to} className='top-result-link'>
                {image ?
                    <img src={image} alt='' className={`top-result-cover ${item.type}`}/> :
                    <span className={`top-result-cover ${item.type} placeholder`} aria-hidden='true'><Icon name='Music2'/></span>
                }
                <span className='top-result-name'>{item.name}</span>
                <span className='top-result-meta'>
                    {by && <span className='top-result-by'>{by}</span>}
                    <span className='top-result-kind'>{kinds[item.type]}</span>
                </span>
            </Link>
            <button className={`top-result-play no-outline${playing ? ' playing' : ''}`} title={playing ? 'Pause' : 'Play'} aria-label={`${playing ? 'Pause' : 'Play'} ${item.name}`}
                    onClick={() => toggle(item.uri, item.type === 'track' ? {uris: [item.uri]} : {context_uri: item.uri})}>
                <Icon name={playing ? 'Pause' : 'Play'} width='24' height='24'/>
            </button>
        </div>
    )
}
