import React from 'react';
import { Link } from 'react-router';
import Icon from '../icons'
import usePlayback from '../../utilities/hooks/usePlayback';
import type { Album } from '../../utilities/types';

// One of an artist's releases: cover, name, "2024 • Album", and a play button that rises on hover or focus.
const ArtistRowItem = ({info}: {info: Album}) => {
    const {name, type, id, images, uri, release_date, album_type} = info
    const thumbNail = images[0]?.url
    const {isPlaying, toggle} = usePlayback()
    const playing = isPlaying(uri)

    return (
        <div className='artistRowItem'>
            <Link to={`/${type}/${id}`} className='artistRowLink'>
                <div className='artistRowThumb'>
                    {thumbNail?
                        <img loading="lazy" src={thumbNail} alt="" />:
                        <div>
                            <Icon name='CD'/>
                        </div>}
                </div>
                <div className="artistRowName ellipsis-one-line">{name}</div>
                <div className="artistRowType">{release_date.slice(0, 4)} • {album_type}</div>
            </Link>
            <button className={`artistRowPlay no-outline ${playing ? 'playing' : ''}`} title={playing ? `Pause ${name}` : `Play ${name}`} aria-label={playing ? `Pause ${name}` : `Play ${name}`} onClick={() => toggle(uri, {context_uri: uri})}>
                <Icon name={playing ? 'Pause' : 'Play'} height='20' width='20'/>
            </button>
        </div>
    );
}

export default ArtistRowItem;
