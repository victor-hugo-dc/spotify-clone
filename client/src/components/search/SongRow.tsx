import React from 'react'
import {Link} from 'react-router'
import Icon from '../icons'
import usePlayback from '../../utilities/hooks/usePlayback'
import formatTime from '../../utilities/time'
import type { Track } from '../../utilities/types'

// A song in the results: its cover (a play button on hover or focus), title, artists, and with `album`, the album.
export default function SongRow({track, album = false}: {track: Track, album?: boolean}) {
    const {nowPlaying, isPlaying, toggle} = usePlayback()
    const playing = isPlaying(track.uri)
    const image = track.album?.images.at(-1)?.url
    const action = `${playing ? 'Pause' : 'Play'} ${track.name} by ${track.artists.map((artist) => artist.name).join(', ')}`

    return (
        <li className={`search-song${album ? ' with-album' : ''}${nowPlaying.trackUri === track.uri ? ' current' : ''}`}>
            <div className='search-song-cover'>
                {image && <img src={image} alt=''/>}
                <button className='search-song-play' title={action} aria-label={action} onClick={() => toggle(track.uri, {uris: [track.uri]})}>
                    <Icon name={playing ? 'Pause' : 'Play'} width='16' height='16'/>
                </button>
            </div>
            <div className='search-song-text'>
                <Link to={`/album/${track.album?.id}?highlight=${track.id}`} className='search-song-title'>{track.name}</Link>
                <span className='search-song-artists'>
                    {track.explicit && <span className='search-explicit' title='Explicit'>E</span>}
                    {track.artists.map((artist, index) => (
                        <React.Fragment key={artist.id}>
                            {index > 0 && ', '}
                            <Link to={`/artist/${artist.id}`}>{artist.name}</Link>
                        </React.Fragment>
                    ))}
                </span>
            </div>
            {album && <Link to={`/album/${track.album?.id}`} className='search-song-album'>{track.album?.name}</Link>}
            <span className='search-song-duration'>{formatTime(track.duration_ms)}</span>
        </li>
    )
}
